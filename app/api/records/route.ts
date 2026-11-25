import { connection } from "next/server";
import { aiConfig } from "@/lib/ai-sentiment";
import { errorMessage } from "@/lib/ingest";
import { getStore } from "@/lib/store";

const SNIPPET = 400;

/** Pulangkan semua rekod dan risiko komoditi untuk dashboard (Supabase atau storan tempatan). */
export async function GET() {
  await connection();
  const store = getStore();
  try {
    const records = (await store.list()).map((r) =>
      r.content.length > SNIPPET ? { ...r, content: `${r.content.slice(0, SNIPPET)}…` } : r,
    );
    const risks = await store.listRisks();
    const ai = aiConfig();
    return Response.json({ ok: true, storage: store.kind, records, risks, aiModel: ai?.model ?? null });
  } catch (e) {
    return Response.json({ ok: false, error: errorMessage(e) }, { status: 500 });
  }
}
