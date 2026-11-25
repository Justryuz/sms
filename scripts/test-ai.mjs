// Uji pengelas AI pada sampel rekod: node scripts/test-ai.mjs [model]
// Membandingkan hasil AI dengan pengelas kata kunci untuk 25 rekod rawak.
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const model = process.argv[2] || env.LLM_MODEL || "gemini/gemini-2.5-flash";
const effort = process.argv[3]; // pilihan: none | low | medium

const store = JSON.parse(readFileSync(new URL("../.data/store.json", import.meta.url), "utf8"));
const all = Object.values(store.records);
const sample = [];
let seed = 7;
while (sample.length < 25) {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  const r = all[seed % all.length];
  if (!sample.includes(r)) sample.push(r);
}

const SYSTEM = readFileSync(new URL("../lib/ai-sentiment.ts", import.meta.url), "utf8").match(
  /const SYSTEM_PROMPT = `([\s\S]*?)`;/,
)[1];
const lines = sample
  .map((r, i) => `[${i}] (komoditi: ${r.commodity}) ${r.content.replace(/\s+/g, " ").slice(0, 700)}`)
  .join("\n");

const t = Date.now();
const res = await fetch(`${env.LLM_BASE_URL}/chat/completions`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.LLM_API_KEY}` },
  body: JSON.stringify({
    model,
    temperature: 0,
    ...(effort ? { reasoning_effort: effort } : {}),
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Kelaskan ${sample.length} item berikut:\n${lines}` },
    ],
  }),
  signal: AbortSignal.timeout(120000),
});
const ms = Date.now() - t;
const data = await res.json();
if (!res.ok) {
  console.log("HTTP", res.status, JSON.stringify(data).slice(0, 400));
  process.exit(1);
}
const content = data.choices[0].message.content;
const parsed = JSON.parse(content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
console.log(`model=${model} effort=${effort ?? "-"} HTTP ${res.status} ${ms}ms usage=${JSON.stringify(data.usage)}`);
let same = 0;
for (const r of parsed.results) {
  const rec = sample[r.i];
  if (rec.sentiment === r.s) same++;
  console.log(
    `[${r.i}] AI=${r.s.padEnd(7)} c=${r.c}  kata_kunci=${rec.sentiment.padEnd(7)} | ${rec.content.replace(/\s+/g, " ").slice(0, 110)}`,
  );
}
console.log(`dapat ${parsed.results.length}/${sample.length}, sama dengan kata kunci: ${same}`);
