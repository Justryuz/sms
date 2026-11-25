import type { Sentiment } from "./types";

/**
 * Pengelasan sentimen dengan LLM melalui gateway serasi OpenAI (cth. LiteLLM).
 * Dikonfigurasi dengan LLM_BASE_URL, LLM_API_KEY dan LLM_MODEL dalam .env.local.
 * Tanpa konfigurasi, sistem kekal menggunakan pengelas kata kunci.
 */

export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  /** none | low | medium | high. "low" diuji paling seimbang antara ketepatan dan kelajuan. */
  reasoningEffort: string | null;
}

export interface AiInput {
  id: string;
  text: string;
  commodity?: string | null;
}

export interface AiResult {
  sentiment: Sentiment;
  confidence: number;
}

const BATCH_SIZE = 25;
const MAX_TEXT = 700;
const TIMEOUT_MS = 90_000;

export function aiConfig(): AiConfig | null {
  const baseUrl = process.env.LLM_BASE_URL?.trim().replace(/\/+$/, "");
  const apiKey = process.env.LLM_API_KEY?.trim();
  const model = process.env.LLM_MODEL?.trim() || "gemini/gemini-2.5-flash";
  const effort = process.env.LLM_REASONING_EFFORT?.trim();
  if (!baseUrl || !apiKey) return null;
  return { baseUrl, apiKey, model, reasoningEffort: effort === "" ? null : (effort ?? "low") };
}

const SYSTEM_PROMPT = `Anda pengelas sentimen untuk sistem pemantauan pasaran komoditi pertanian Malaysia (sayur, buah, ayam, telur, cili, bawang).
Setiap item ialah ringkasan siaran media sosial, berita atau laman harga (BM, Inggeris, Indonesia, Cina dan lain-lain).
Kelaskan sentimen DARI SUDUT PENGGUNA DAN PASARAN TEMPATAN:
- "positif": harga turun/murah, promosi/diskaun, bekalan mencukupi atau stabil, kualiti baik/segar, berita baik untuk pengguna atau petani tempatan.
- "negatif": harga naik/mahal, kekurangan bekalan, rosak/busuk, banjir/cuaca buruk/penyakit menjejaskan hasil, aduan, sorok barang, kerugian petani.
- "neutral": maklumat fakta tanpa arah jelas (senarai harga tanpa perubahan, penerangan gambar, pengumuman biasa), atau isyarat bercampur seimbang.
Jangan anggap iklan biasa sebagai positif kecuali ada tawaran/harga menarik. Penerangan gambar produk sahaja ialah neutral.
"c" ialah keyakinan anda 0.0-1.0.
Balas JSON SAHAJA dalam bentuk: {"results":[{"i":<indeks>,"s":"positif|neutral|negatif","c":<0-1>}]} dengan satu entri bagi setiap item.`;

function isSentiment(v: unknown): v is Sentiment {
  return v === "positif" || v === "negatif" || v === "neutral";
}

function extractJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(t);
  } catch {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(t.slice(start, end + 1));
    throw new Error("Respons AI bukan JSON.");
  }
}

async function classifyBatch(cfg: AiConfig, items: AiInput[]): Promise<Map<string, AiResult>> {
  const lines = items
    .map((it, i) => {
      const text = it.text.replace(/\s+/g, " ").slice(0, MAX_TEXT);
      return `[${i}]${it.commodity ? ` (komoditi: ${it.commodity})` : ""} ${text}`;
    })
    .join("\n");

  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0,
      ...(cfg.reasoningEffort ? { reasoning_effort: cfg.reasoningEffort } : {}),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Kelaskan ${items.length} item berikut:\n${lines}` },
      ],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gateway AI ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? "";
  const parsed = extractJson(content) as { results?: { i?: unknown; s?: unknown; c?: unknown }[] };

  const out = new Map<string, AiResult>();
  for (const r of parsed.results ?? []) {
    const i = Number(r.i);
    const s = typeof r.s === "string" ? r.s.trim().toLowerCase() : r.s;
    if (!Number.isInteger(i) || i < 0 || i >= items.length || !isSentiment(s)) continue;
    const c = Number(r.c);
    out.set(items[i].id, {
      sentiment: s,
      confidence: Number.isFinite(c) ? Math.round(Math.min(1, Math.max(0, c)) * 100) / 100 : 0.7,
    });
  }
  return out;
}

export interface ClassifyOutcome {
  results: Map<string, AiResult>;
  failedBatches: number;
  errors: string[];
}

/**
 * Kelaskan banyak item secara berkelompok dengan had serentak.
 * Kelompok yang gagal dilaporkan; item itu kekal dengan sentimen sedia ada.
 */
export async function classifyWithAi(
  cfg: AiConfig,
  items: AiInput[],
  opts: { concurrency?: number; deadline?: number } = {},
): Promise<ClassifyOutcome> {
  const batches: AiInput[][] = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) batches.push(items.slice(i, i + BATCH_SIZE));

  const results = new Map<string, AiResult>();
  const errors: string[] = [];
  let failedBatches = 0;
  let next = 0;

  const worker = async () => {
    while (next < batches.length) {
      if (opts.deadline && Date.now() > opts.deadline) return;
      const batch = batches[next++];
      try {
        let got = await classifyBatch(cfg, batch);
        // Cuba sekali lagi untuk item yang tertinggal dalam respons.
        const missing = batch.filter((b) => !got.has(b.id));
        if (missing.length > 0 && missing.length < batch.length) {
          const retry = await classifyBatch(cfg, missing).catch(() => new Map<string, AiResult>());
          got = new Map([...got, ...retry]);
        }
        for (const [k, v] of got) results.set(k, v);
      } catch (e) {
        failedBatches++;
        if (errors.length < 5) errors.push(e instanceof Error ? e.message : String(e));
      }
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, opts.concurrency ?? 4) }, worker));
  return { results, failedBatches, errors };
}
