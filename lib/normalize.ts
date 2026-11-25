import Papa from "papaparse";
import { classifySourceType, classifyTopics, detectLocations, normalizeLang, sourceName } from "./categorize";
import { commoditySlug } from "./commodity";
import { classifySentiment } from "./sentiment-lexicon";
import type { CommodityRisk, NewSentimentRecord, Sentiment } from "./types";

type Row = Record<string, unknown>;

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CONTENT = 2000;
const LIST_KEYS = ["records", "data", "items", "results", "posts", "comments", "mentions"];

function isRow(v: unknown): v is Row {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Ambil senarai baris daripada JSON (tatasusunan atau objek pembungkus). */
export function extractArray(json: unknown): Row[] {
  if (Array.isArray(json)) return json.filter(isRow);
  if (isRow(json)) {
    for (const key of LIST_KEYS) {
      const v = json[key];
      if (Array.isArray(v)) return v.filter(isRow);
    }
    return [json];
  }
  return [];
}

/** Baca teks fail JSON, JSONL atau CSV menjadi senarai baris mentah. */
export function parseRows(fileName: string, text: string): Row[] {
  const t = text.replace(/^\uFEFF/, "").trim();
  if (!t) return [];
  const looksJson = t.startsWith("[") || t.startsWith("{");
  if (/\.csv$/i.test(fileName) || !looksJson) {
    const parsed = Papa.parse<Row>(t, { header: true, skipEmptyLines: true });
    return parsed.data.filter(isRow);
  }
  try {
    return extractArray(JSON.parse(t));
  } catch {
    const rows: Row[] = [];
    for (const line of t.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const v: unknown = JSON.parse(line);
        if (isRow(v)) rows.push(v);
      } catch {
        throw new Error(`Format fail "${fileName}" tidak sah (bukan JSON/JSONL/CSV yang sah).`);
      }
    }
    return rows;
  }
}

function lowerKeys(row: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.trim().toLowerCase().replace(/[\s-]+/g, "_")] = v;
  }
  return out;
}

function pick(row: Row, keys: string[]): unknown {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

export function normalizePlatform(v: unknown): string | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (s === "x" || s.includes("twitter") || /(^|[/.])x\.com\b/.test(s)) return "x";
  if (s.includes("tiktok") || s === "tt") return "tiktok";
  if (s.includes("facebook") || s === "fb" || /(^|[/.])fb\.com\b/.test(s)) return "facebook";
  if (s.includes("threads")) return "threads";
  if (s.includes("instagram") || s === "ig") return "instagram";
  if (s.includes("youtube") || s === "yt") return "youtube";
  // Laman berita, blog dan kedai dalam talian (cth. manamurah, jelaskini, news) dikira "web".
  return "web";
}

export function normalizeSentiment(v: unknown): Sentiment | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (s.startsWith("pos") || s === "+" || s === "1") return "positif";
  if (s.startsWith("neg") || s === "-" || s === "-1") return "negatif";
  if (s.startsWith("neu") || s.startsWith("net") || s === "0" || s === "mixed") return "neutral";
  return null;
}

/** Nombor daripada nilai mentah. Kosong / tiada = NaN (bukan 0), supaya "tiada data" tidak dikira sebagai sifar. */
function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  const s = String(v ?? "").replace(/[%,\s]/g, "");
  if (s === "") return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function normalizeConfidence(v: unknown): number {
  const n = toNumber(v);
  if (!Number.isFinite(n)) return 0;
  const frac = n > 1 ? n / 100 : n;
  return Math.min(1, Math.max(0, Math.round(frac * 10000) / 10000));
}

function normalizeDate(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = s.slice(0, 10);
    return isValidYmd(d) ? d : null;
  }
  const t = new Date(s);
  return Number.isNaN(t.getTime()) ? null : t.toISOString().slice(0, 10);
}

export function isValidYmd(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function normalizeKeywords(raw: unknown, content: string): string[] {
  let list: string[] = [];
  if (Array.isArray(raw)) {
    list = raw.map((x) => String(x));
  } else if (typeof raw === "string" && raw.trim()) {
    const s = raw.trim();
    if (s.startsWith("[")) {
      try {
        const arr: unknown = JSON.parse(s);
        if (Array.isArray(arr)) list = arr.map((x) => String(x));
      } catch {
        list = s.split(/[,;|]/);
      }
    } else {
      list = s.split(/[,;|]/);
    }
  }
  if (list.length === 0) list = content.match(/#[\p{L}\p{N}_]+/gu) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of list) {
    const t = k.trim();
    if (!t || t.length > 60) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out.slice(0, 20);
}

function fnv1a(str: string, seed: number): string {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** Kategori siaran: topik, jenis sumber, lokasi. */
function categorize(content: string, platform: string, url: unknown, rawPlatform: unknown, commodity: string) {
  const source = sourceName(url, rawPlatform);
  const { states, districts } = detectLocations(content);
  return {
    commodity: commodity || null,
    source,
    source_type: classifySourceType(platform, source ?? ""),
    topics: classifyTopics(content),
    states,
    districts,
  };
}

export interface NormalizeResult {
  records: NewSentimentRecord[];
  skipped: number;
}

/**
 * Normalkan baris mentah crawl muse.ai. Tarikh dalam rekod diutamakan;
 * `fallbackDate` (tarikh folder) digunakan jika rekod tiada tarikh.
 */
export function normalizeRecords(rows: Row[], fallbackDate: string | null): NormalizeResult {
  const byId = new Map<string, NewSentimentRecord>();
  let skipped = 0;

  for (const original of rows) {
    const row = lowerKeys(original);

    // Fail "cleansed" menanda baris tidak relevan dengan relevant=false.
    const relevant = row.relevant;
    if (relevant === false || String(relevant ?? "").trim().toLowerCase() === "false") {
      skipped++;
      continue;
    }

    const content = String(pick(row, ["content", "text", "comment", "message", "caption", "body", "summary_text", "summary", "description"]) ?? "")
      .trim()
      .slice(0, MAX_CONTENT);
    const rawPlatform = pick(row, ["platform", "source", "network", "channel"]);
    const url = pick(row, ["url", "link", "permalink", "post_url"]);
    const platform = normalizePlatform(rawPlatform ?? url);
    const labelled = normalizeSentiment(pick(row, ["sentiment", "label", "sentimen", "sentiment_label"]));
    const crawlDate =
      normalizeDate(pick(row, ["crawl_date", "date", "tarikh", "crawled_at", "created_at", "timestamp"])) ??
      fallbackDate;

    if (!content || !platform || !crawlDate) {
      skipped++;
      continue;
    }

    // Data tanpa label sentimen (cth. Agri Data Platform) dikelaskan dengan leksikon.
    const guess = labelled ? null : classifySentiment(content);
    const sentiment: Sentiment = labelled ?? guess!.sentiment;

    const commodity = commoditySlug(String(pick(row, ["commodity", "komoditi", "topic"]) ?? ""));
    const keywords = normalizeKeywords(pick(row, ["keywords", "hashtags", "tags", "kata_kunci"]), content);
    if (commodity && !keywords.some((k) => k.toLowerCase() === `#${commodity}`)) {
      keywords.unshift(`#${commodity}`);
    }

    const rawId = pick(row, ["external_id", "id", "post_id", "comment_id", "uid"]);
    const externalId = rawId !== undefined
      ? `${platform}:${String(rawId).trim()}`
      : `h:${fnv1a(`${platform}|${content}`, 2166136261)}${fnv1a(`${content}|${platform}`, 84696351)}`;

    const count = (keys: string[]) => {
      const n = toNumber(pick(row, keys));
      return Number.isFinite(n) ? Math.max(0, Math.round(n)) : null;
    };
    const likes = count(["likes", "like_count", "reactions", "reaction_count"]);
    const comments = count(["comments", "replies", "comment_count", "reply_count"]);
    const shares = count(["shares", "share_count", "retweets", "reposts"]);
    const explicit = count(["engagement_count", "engagement", "interactions"]);
    const engagement = explicit ?? (likes ?? 0) + (comments ?? 0) + (shares ?? 0);
    byId.set(externalId, {
      external_id: externalId,
      crawl_date: crawlDate,
      platform,
      content,
      sentiment,
      confidence_score: guess
        ? guess.confidence
        : normalizeConfidence(pick(row, ["confidence_score", "confidence", "score", "ai_confidence"])),
      sentiment_source: guess ? "kata_kunci" : "label",
      keywords: keywords.slice(0, 20),
      engagement_count: engagement,
      likes,
      comments,
      shares,
      ...categorize(content, platform, url, rawPlatform, commodity),
      lang: normalizeLang(pick(row, ["lang", "language", "bahasa"])),
      posted_date: normalizeDate(pick(row, ["posted_date", "posted_at", "published_at", "post_date"])),
    });
  }

  // Baris berganda dalam satu kumpulan digabungkan (elak ralat ON CONFLICT dua kali).
  skipped += rows.length - skipped - byId.size;
  return { records: [...byId.values()], skipped };
}

function numOrNull(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = toNumber(v);
  return Number.isFinite(n) ? n : null;
}

/** True jika baris kelihatan seperti fail db-curated (risiko per komoditi). */
export function isRiskRow(row: Row): boolean {
  const r = lowerKeys(row);
  return "risk_current" in r && "commodity" in r;
}

/** Normalkan baris db-curated. Kunci unik: tarikh + slug komoditi. */
export function normalizeRiskRows(rows: Row[], fallbackDate: string | null): { risks: CommodityRisk[]; skipped: number } {
  const byKey = new Map<string, CommodityRisk>();
  let skipped = 0;
  for (const original of rows) {
    const row = lowerKeys(original);
    const commodity = commoditySlug(String(pick(row, ["commodity", "komoditi"]) ?? ""));
    const date = normalizeDate(pick(row, ["date", "crawl_date", "tarikh"])) ?? fallbackDate;
    if (!commodity || !date) {
      skipped++;
      continue;
    }
    const prelim = String(row.preliminary ?? "").trim().toLowerCase();
    const key = `${date}:${commodity}`;
    byKey.set(key, {
      key,
      date,
      commodity,
      risk_before: numOrNull(row.risk_before),
      risk_current: numOrNull(row.risk_current),
      risk_forward: numOrNull(row.risk_forward),
      band: String(row.band ?? "").trim().slice(0, 30),
      sentiment_index: numOrNull(row.sentiment_index),
      sample_n: numOrNull(row.sample_n),
      price_label: String(row.price_label ?? "").trim().slice(0, 200),
      price_value: numOrNull(row.price_value),
      price_unit: String(row.price_unit ?? "").trim().slice(0, 40),
      price_date: normalizeDate(row.price_date),
      preliminary: row.preliminary === true || prelim === "true" || prelim === "1",
      analyst_note: String(row.analyst_note ?? "").trim().slice(0, MAX_CONTENT),
    });
  }
  skipped += rows.length - skipped - byKey.size;
  return { risks: [...byKey.values()], skipped };
}