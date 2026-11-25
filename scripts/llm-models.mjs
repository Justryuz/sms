// Senaraikan model yang boleh digunakan oleh LLM_API_KEY: node scripts/llm-models.mjs
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);

const t = Date.now();
try {
  const res = await fetch(`${env.LLM_BASE_URL}/models`, {
    headers: { Authorization: `Bearer ${env.LLM_API_KEY}` },
    signal: AbortSignal.timeout(20000),
  });
  const json = await res.json();
  console.log(`HTTP ${res.status} (${Date.now() - t}ms)`);
  console.log((json.data ?? []).map((m) => m.id).join("\n") || JSON.stringify(json).slice(0, 500));
} catch (e) {
  console.log("Ralat:", e.cause?.code ?? e.message);
}
