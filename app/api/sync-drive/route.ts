import type { NextRequest } from "next/server";
import { runAiClassification } from "@/lib/classify-runner";
import { getDriveSource, type DriveEntry, type DriveSource } from "@/lib/drive-source";
import { errorMessage } from "@/lib/ingest";
import { DATE_RE, isRiskRow, normalizeRecords, normalizeRiskRows, parseRows } from "@/lib/normalize";
import { getStore } from "@/lib/store";
import type { SyncResult } from "@/lib/types";

const MAX_DEPTH = 2;
const READABLE = /\.(json|jsonl|csv)$/i;

function fail(error: string, status: number) {
  return Response.json({ ok: false, error }, { status });
}

/** Jika ada CSV dan JSON dengan nama sama, ambil CSV sahaja. */
function dedupeByBase(files: DriveEntry[]): DriveEntry[] {
  const byBase = new Map<string, DriveEntry>();
  for (const f of files) {
    const base = f.name.replace(READABLE, "").toLowerCase();
    if (!byBase.has(base) || /\.csv$/i.test(f.name)) byBase.set(base, f);
  }
  return [...byBase.values()];
}

/**
 * Pilih fail untuk diimport daripada satu folder.
 * Agri Data Platform: setiap folder ada db-raw, db-cleansed, db-curated.
 *  - "cleansed": siaran relevan yang sudah ditapis -> sebutan (sentiment_records)
 *  - "curated":  risiko, harga & nota analis per komoditi -> commodity_risk
 *  - "raw":      versi belum ditapis, tidak diimport
 */
function selectFiles(files: DriveEntry[]): DriveEntry[] {
  const readable = files.filter((f) => READABLE.test(f.name));
  const cleansed = readable.filter((f) => /cleansed/i.test(f.name));
  const curated = readable.filter((f) => /curated/i.test(f.name));
  if (cleansed.length > 0 || curated.length > 0) return [...dedupeByBase(cleansed), ...dedupeByBase(curated)];
  return readable.filter((f) => !/(^|[-_])raw([-_.]|$)/i.test(f.name));
}
interface Candidate {
  file: DriveEntry;
  folderName: string;
  dateHint: string | null;
}

async function collectFiles(
  drive: DriveSource,
  folderId: string,
  folderName: string,
  dateHint: string | null,
  depth: number,
): Promise<Candidate[]> {
  const entries = await drive.list(folderId);
  const out: Candidate[] = selectFiles(entries.filter((e) => !e.isFolder)).map((file) => ({
    file,
    folderName,
    dateHint,
  }));
  if (depth < MAX_DEPTH) {
    for (const sub of entries.filter((e) => e.isFolder)) {
      out.push(
        ...(await collectFiles(
          drive,
          sub.id,
          `${folderName}/${sub.name}`,
          DATE_RE.test(sub.name) ? sub.name : dateHint,
          depth + 1,
        )),
      );
    }
  }
  return out;
}

interface SyncOptions {
  force?: boolean;
  includeHistorical?: boolean;
  maxFiles?: number;
  /** Had masa pengelasan AI selepas sync (ms). 0 = langkau. */
  aiBudgetMs?: number;
}

async function runSync(opts: SyncOptions) {
  const rootId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  if (!rootId || !/^[\w-]+$/.test(rootId)) {
    return fail("GOOGLE_DRIVE_FOLDER_ID tidak ditetapkan atau tidak sah dalam .env.local.", 503);
  }

  let drive: DriveSource;
  try {
    drive = getDriveSource();
  } catch (e) {
    return fail(errorMessage(e), 503);
  }
  const store = getStore();

  const force = opts.force === true;
  const includeHistorical = opts.includeHistorical === true;
  const maxFiles = Math.min(Math.max(Number(opts.maxFiles) || 100, 1), 500);

  const result: SyncResult = {
    ok: true,
    foldersScanned: 0,
    filesProcessed: 0,
    filesSkipped: 0,
    newRecords: 0,
    updatedRecords: 0,
    riskRows: 0,
    skippedRows: 0,
    partial: false,
    errors: [],
  };

  try {
    const folders = (await drive.list(rootId))
      .filter((f) => f.isFolder && (DATE_RE.test(f.name) || (includeHistorical && /^historical$/i.test(f.name))))
      .sort((a, b) => {
        // Folder tarikh terkini dahulu, Historical paling akhir.
        const ad = DATE_RE.test(a.name);
        const bd = DATE_RE.test(b.name);
        if (ad !== bd) return ad ? -1 : 1;
        return b.name.localeCompare(a.name);
      });

    outer: for (const folder of folders) {
      result.foldersScanned++;
      const candidates = await collectFiles(
        drive,
        folder.id,
        folder.name,
        DATE_RE.test(folder.name) ? folder.name : null,
        0,
      );
      if (candidates.length === 0) continue;

      const synced = force ? new Map<string, string | null>() : await store.getSynced(candidates.map((c) => c.file.id));

      for (const c of candidates) {
        if (!force && synced.has(c.file.id) && synced.get(c.file.id) === c.file.modified) {
          result.filesSkipped++;
          continue;
        }
        if (result.filesProcessed >= maxFiles) {
          result.partial = true;
          break outer;
        }
        try {
          const rows = parseRows(c.file.name, await drive.read(c.file));
          let count = 0;
          if (rows.length > 0 && isRiskRow(rows[0])) {
            const { risks, skipped } = normalizeRiskRows(rows, c.dateHint);
            result.skippedRows += skipped;
            if (risks.length > 0) result.riskRows += await store.upsertRisks(risks);
            count = risks.length;
          } else {
            const { records, skipped } = normalizeRecords(rows, c.dateHint);
            result.skippedRows += skipped;
            if (records.length > 0) {
              const { inserted, updated } = await store.upsert(records);
              result.newRecords += inserted;
              result.updatedRecords += updated;
            }
            count = records.length;
          }
          await store.markSynced({
            file_id: c.file.id,
            folder_name: c.folderName,
            file_name: c.file.name,
            modified_time: c.file.modified,
            record_count: count,
          });
          result.filesProcessed++;
        } catch (e) {
          result.errors.push(`${c.folderName}/${c.file.name}: ${errorMessage(e)}`);
        }
      }
    }
  } catch (e) {
    return fail(`Segerak Google Drive gagal: ${errorMessage(e)}`, 500);
  }

  // Kelaskan rekod baharu (dan baki rekod lama) dengan AI dalam had masa.
  const aiBudget = opts.aiBudgetMs ?? 120_000;
  if (aiBudget > 0) result.ai = await runAiClassification(store, { limit: 1000, timeBudgetMs: aiBudget });

  return Response.json(result);
}

/** Butang "Sync Google Drive" di UI. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as SyncOptions;
  return runSync({
    force: body.force,
    includeHistorical: body.includeHistorical,
    maxFiles: body.maxFiles,
    aiBudgetMs: typeof body.aiBudgetMs === "number" ? Math.min(Math.max(body.aiBudgetMs, 0), 240_000) : undefined,
  });
}

/**
 * Segerak harian oleh penjadual (Vercel Cron, Task Scheduler + curl).
 * Memerlukan header `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return fail(
      "Endpoint GET ini untuk penjadual harian dan memerlukan CRON_SECRET. Untuk segerak manual, tekan butang \"Sync Google Drive\" di dashboard.",
      503,
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return fail("Tidak dibenarkan.", 401);
  // Penjadual tidak tergesa-gesa: beri masa lebih untuk pengelasan AI.
  return runSync({ aiBudgetMs: 240_000 });
}
