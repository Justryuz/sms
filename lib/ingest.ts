import type { SupabaseClient } from "@supabase/supabase-js";
import { TABLE } from "./constants";
import type { NewSentimentRecord, SentimentRecord } from "./types";

type Prev = Pick<SentimentRecord, "content" | "sentiment" | "confidence_score" | "sentiment_source">;

/**
 * Kekalkan sentimen AI sedia ada jika teks siaran tidak berubah, supaya sync semula
 * tidak menimpa hasil AI dengan anggaran kata kunci (dan tidak perlu panggil AI lagi).
 */
export function keepAiSentiment<T extends NewSentimentRecord>(incoming: T, prev: Prev | undefined): T {
  if (!prev || prev.sentiment_source !== "ai" || incoming.sentiment_source !== "kata_kunci") return incoming;
  if (prev.content !== incoming.content) return incoming;
  return { ...incoming, sentiment: prev.sentiment, confidence_score: prev.confidence_score, sentiment_source: "ai" };
}

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e !== null && "message" in e) return String((e as { message: unknown }).message);
  return String(e);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Upsert pada external_id. Mengira rekod baharu berbanding yang dikemas kini. */
export async function upsertRecords(admin: SupabaseClient, records: NewSentimentRecord[]) {
  const unique = [...new Map(records.map((r) => [r.external_id, r])).values()];

  const prev = new Map<string, Prev>();
  for (const ids of chunk(unique.map((r) => r.external_id), 200)) {
    const { data, error } = await admin
      .from(TABLE)
      .select("external_id, content, sentiment, confidence_score, sentiment_source")
      .in("external_id", ids);
    if (error) throw error;
    for (const row of (data ?? []) as (Prev & { external_id: string })[]) prev.set(row.external_id, row);
  }
  const existing = prev.size;
  const merged = unique.map((r) => keepAiSentiment(r, prev.get(r.external_id)));

  for (const part of chunk(merged, 500)) {
    const { error } = await admin.from(TABLE).upsert(part, { onConflict: "external_id" });
    if (error) throw error;
  }

  return { inserted: unique.length - existing, updated: existing };
}
