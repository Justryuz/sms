import type { NextRequest } from "next/server";
import { errorMessage } from "@/lib/ingest";
import { extractArray, isValidYmd, normalizeRecords, parseRows } from "@/lib/normalize";
import { getStore } from "@/lib/store";
import type { IngestResult } from "@/lib/types";

const MAX_BYTES = 20 * 1024 * 1024;
const MAX_ROWS = 100_000;

function fail(error: string, status: number) {
  return Response.json({ ok: false, error }, { status });
}

/**
 * Terima kumpulan JSON / CSV crawl muse.ai dan upsert pada external_id.
 *  - multipart/form-data: `files` (satu atau lebih) + `crawl_date`
 *  - application/json: tatasusunan rekod, atau { crawl_date, records: [...] }
 *  - text/csv: badan CSV, `?crawl_date=YYYY-MM-DD`
 */
export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) {
    return fail("Saiz muat naik melebihi had 20MB.", 413);
  }

  let crawlDate = request.nextUrl.searchParams.get("crawl_date");
  let rows: ReturnType<typeof extractArray> = [];

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const d = form.get("crawl_date");
      if (typeof d === "string" && d) crawlDate = d;
      for (const f of form.getAll("files")) {
        if (typeof f === "string") continue;
        if (f.size > MAX_BYTES) return fail(`Fail "${f.name}" melebihi had 20MB.`, 413);
        rows.push(...parseRows(f.name, await f.text()));
      }
    } else if (contentType.includes("application/json")) {
      const body: unknown = await request.json();
      if (!Array.isArray(body) && typeof body === "object" && body !== null) {
        const d = (body as { crawl_date?: unknown }).crawl_date;
        if (typeof d === "string" && d) crawlDate = d;
      }
      rows = extractArray(body);
    } else {
      rows = parseRows("payload.csv", await request.text());
    }
  } catch (e) {
    return fail(errorMessage(e), 400);
  }

  if (crawlDate && !isValidYmd(crawlDate)) {
    return fail("crawl_date mesti dalam format YYYY-MM-DD.", 400);
  }
  if (rows.length === 0) return fail("Tiada rekod ditemui dalam data yang dihantar.", 400);
  if (rows.length > MAX_ROWS) return fail(`Terlalu banyak rekod (had ${MAX_ROWS}).`, 413);

  const { records, skipped } = normalizeRecords(rows, crawlDate);
  if (records.length === 0) {
    return fail("Tiada rekod sah. Pastikan ada medan kandungan (content/summary_text), platform dan tarikh.", 422);
  }

  try {
    const { inserted, updated } = await getStore().upsert(records);
    const result: IngestResult = {
      ok: true,
      received: rows.length,
      skipped,
      inserted,
      updated,
    };
    return Response.json(result);
  } catch (e) {
    return fail(`Gagal menyimpan rekod: ${errorMessage(e)}`, 500);
  }
}
