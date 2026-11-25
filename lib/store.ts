import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { TABLE } from "./constants";
import { keepAiSentiment, upsertRecords } from "./ingest";
import { getSupabaseAdmin } from "./supabase-admin";
import type { CommodityRisk, NewSentimentRecord, Sentiment, SentimentRecord } from "./types";

export interface AiUpdate {
  external_id: string;
  sentiment: Sentiment;
  confidence_score: number;
}

const RISK_TABLE = "commodity_risk";

export interface SyncLogEntry {
  file_id: string;
  folder_name: string;
  file_name: string;
  modified_time: string | null;
  record_count: number;
}

export interface Store {
  kind: "supabase" | "local";
  getSynced(fileIds: string[]): Promise<Map<string, string | null>>;
  upsert(records: NewSentimentRecord[]): Promise<{ inserted: number; updated: number }>;
  markSynced(entry: SyncLogEntry): Promise<void>;
  list(): Promise<SentimentRecord[]>;
  upsertRisks(risks: CommodityRisk[]): Promise<number>;
  listRisks(): Promise<CommodityRisk[]>;
  /** Rekod yang sentimennya belum dikelas AI (terbaru dahulu) dan jumlah keseluruhannya. */
  pendingAi(limit: number): Promise<{ records: SentimentRecord[]; total: number }>;
  applyAi(updates: AiUpdate[]): Promise<void>;
}

/** Rekod menunggu AI: dikelas kata kunci, atau rekod lama tanpa sumber sentimen. */
function isPendingAi(r: SentimentRecord): boolean {
  return r.sentiment_source !== "ai" && r.sentiment_source !== "label";
}

// ---------- Supabase ----------

function supabaseStore(): Store | null {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  return {
    kind: "supabase",
    async getSynced(ids) {
      const map = new Map<string, string | null>();
      for (let i = 0; i < ids.length; i += 200) {
        const { data, error } = await admin
          .from("drive_sync_log")
          .select("file_id, modified_time")
          .in("file_id", ids.slice(i, i + 200));
        if (error) throw error;
        for (const r of data ?? []) map.set(r.file_id, r.modified_time);
      }
      return map;
    },
    upsert: (records) => upsertRecords(admin, records),
    async markSynced(entry) {
      const { error } = await admin
        .from("drive_sync_log")
        .upsert({ ...entry, synced_at: new Date().toISOString() }, { onConflict: "file_id" });
      if (error) throw error;
    },
    async list() {
      const out: SentimentRecord[] = [];
      for (let from = 0; from < 50_000; from += 1000) {
        const { data, error } = await admin
          .from(TABLE)
          .select("*")
          .order("crawl_date", { ascending: false })
          .order("id", { ascending: true })
          .range(from, from + 999);
        if (error) throw error;
        out.push(...(data as SentimentRecord[]));
        if (data.length < 1000) break;
      }
      return out;
    },
    async upsertRisks(risks) {
      for (let i = 0; i < risks.length; i += 500) {
        const { error } = await admin.from(RISK_TABLE).upsert(risks.slice(i, i + 500), { onConflict: "key" });
        if (error) throw error;
      }
      return risks.length;
    },
    async pendingAi(limit) {
      const { data, error, count } = await admin
        .from(TABLE)
        .select("*", { count: "exact" })
        .or("sentiment_source.is.null,sentiment_source.eq.kata_kunci")
        .order("crawl_date", { ascending: false })
        .order("id", { ascending: true })
        .limit(limit);
      if (error) throw error;
      return { records: (data ?? []) as SentimentRecord[], total: count ?? data?.length ?? 0 };
    },
    async applyAi(updates) {
      if (updates.length === 0) return;
      // Upsert rekod penuh (bukan separa) supaya kekangan NOT NULL dipenuhi.
      const ids = updates.map((u) => u.external_id);
      const byId = new Map(updates.map((u) => [u.external_id, u]));
      for (let i = 0; i < ids.length; i += 200) {
        const { data, error } = await admin.from(TABLE).select("*").in("external_id", ids.slice(i, i + 200));
        if (error) throw error;
        const rows = ((data ?? []) as SentimentRecord[]).map((r) => {
          const u = byId.get(r.external_id)!;
          return { ...r, sentiment: u.sentiment, confidence_score: u.confidence_score, sentiment_source: "ai" };
        });
        const { error: upErr } = await admin.from(TABLE).upsert(rows, { onConflict: "external_id" });
        if (upErr) throw upErr;
      }
    },
    async listRisks() {
      const out: CommodityRisk[] = [];
      for (let from = 0; from < 50_000; from += 1000) {
        const { data, error } = await admin
          .from(RISK_TABLE)
          .select("*")
          .order("date", { ascending: false })
          .order("key", { ascending: true })
          .range(from, from + 999);
        if (error) throw error;
        out.push(...(data as CommodityRisk[]));
        if (data.length < 1000) break;
      }
      return out;
    },
  };
}

// ---------- Fail tempatan (.data/store.json) ----------

interface LocalData {
  records: Record<string, SentimentRecord>;
  risks?: Record<string, CommodityRisk>;
  syncLog: Record<string, SyncLogEntry & { synced_at: string }>;
}

const DATA_FILE = path.join(process.cwd(), ".data", "store.json");
let cache: LocalData | null = null;
let queue: Promise<unknown> = Promise.resolve();

/** Siri-kan akses supaya dua segerak serentak tidak menulis ganti satu sama lain. */
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

async function load(): Promise<LocalData> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await fs.readFile(DATA_FILE, "utf8")) as LocalData;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    cache = { records: {}, syncLog: {} };
  }
  return cache;
}

async function save(data: LocalData) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data));
  await fs.rename(tmp, DATA_FILE);
}

const localStore: Store = {
  kind: "local",
  getSynced: (ids) =>
    serial(async () => {
      const d = await load();
      const map = new Map<string, string | null>();
      for (const id of ids) if (d.syncLog[id]) map.set(id, d.syncLog[id].modified_time);
      return map;
    }),
  upsert: (records) =>
    serial(async () => {
      const d = await load();
      const now = new Date().toISOString();
      let inserted = 0;
      let updated = 0;
      for (const r of records) {
        const prev = d.records[r.external_id];
        if (prev) updated++;
        else inserted++;
        d.records[r.external_id] = {
          ...keepAiSentiment(r, prev),
          id: prev?.id ?? crypto.randomUUID(),
          created_at: prev?.created_at ?? now,
        };
      }
      await save(d);
      return { inserted, updated };
    }),
  markSynced: (entry) =>
    serial(async () => {
      const d = await load();
      d.syncLog[entry.file_id] = { ...entry, synced_at: new Date().toISOString() };
      await save(d);
    }),
  list: () => serial(async () => Object.values((await load()).records)),
  upsertRisks: (risks) =>
    serial(async () => {
      const d = await load();
      d.risks ??= {};
      for (const r of risks) d.risks[r.key] = r;
      await save(d);
      return risks.length;
    }),
  listRisks: () => serial(async () => Object.values((await load()).risks ?? {})),
  pendingAi: (limit) =>
    serial(async () => {
      const all = Object.values((await load()).records).filter(isPendingAi);
      all.sort((a, b) => b.crawl_date.localeCompare(a.crawl_date) || a.external_id.localeCompare(b.external_id));
      return { records: all.slice(0, limit), total: all.length };
    }),
  applyAi: (updates) =>
    serial(async () => {
      if (updates.length === 0) return;
      const d = await load();
      for (const u of updates) {
        const r = d.records[u.external_id];
        if (!r) continue;
        r.sentiment = u.sentiment;
        r.confidence_score = u.confidence_score;
        r.sentiment_source = "ai";
      }
      await save(d);
    }),
};

/** Supabase jika dikonfigurasi, jika tidak storan fail tempatan. */
export function getStore(): Store {
  return supabaseStore() ?? localStore;
}
