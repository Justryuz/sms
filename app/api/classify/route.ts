import type { NextRequest } from "next/server";
import { runAiClassification } from "@/lib/classify-runner";
import { getStore } from "@/lib/store";

/**
 * Kelaskan rekod yang belum dikelas AI. Panggil berulang kali sehingga `remaining` = 0.
 * Badan pilihan: { "limit": 500 }
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { limit?: unknown };
  const limit = Number(body.limit) || 500;
  const result = await runAiClassification(getStore(), { limit, timeBudgetMs: 240_000 });
  return Response.json(result, { status: result.ok ? 200 : 502 });
}
