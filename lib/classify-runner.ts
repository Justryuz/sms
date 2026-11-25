import "server-only";
import { aiConfig, classifyWithAi } from "./ai-sentiment";
import { errorMessage } from "./ingest";
import type { Store } from "./store";
import type { ClassifyResult } from "./types";

/**
 * Kelaskan rekod yang belum dikelas AI, sehingga had bilangan atau masa.
 * Rekod yang gagal kekal dengan sentimen kata kunci dan dicuba semula pada panggilan seterusnya.
 */
export async function runAiClassification(
  store: Store,
  opts: { limit?: number; timeBudgetMs?: number } = {},
): Promise<ClassifyResult> {
  const cfg = aiConfig();
  if (!cfg) {
    return { ok: true, enabled: false, classified: 0, remaining: 0, failedBatches: 0, errors: [] };
  }
  const limit = Math.min(Math.max(opts.limit ?? 500, 1), 2000);
  const deadline = Date.now() + (opts.timeBudgetMs ?? 180_000);

  try {
    const { records, total } = await store.pendingAi(limit);
    if (records.length === 0) {
      return { ok: true, enabled: true, classified: 0, remaining: 0, failedBatches: 0, errors: [] };
    }
    const outcome = await classifyWithAi(
      cfg,
      records.map((r) => ({ id: r.external_id, text: r.content, commodity: r.commodity })),
      { concurrency: 4, deadline },
    );
    const updates = [...outcome.results].map(([external_id, v]) => ({
      external_id,
      sentiment: v.sentiment,
      confidence_score: v.confidence,
    }));
    await store.applyAi(updates);
    return {
      ok: true,
      enabled: true,
      classified: updates.length,
      remaining: Math.max(0, total - updates.length),
      failedBatches: outcome.failedBatches,
      errors: outcome.errors,
    };
  } catch (e) {
    return {
      ok: false,
      enabled: true,
      classified: 0,
      remaining: 0,
      failedBatches: 0,
      errors: [errorMessage(e)],
      error: `Pengelasan AI gagal: ${errorMessage(e)}`,
    };
  }
}
