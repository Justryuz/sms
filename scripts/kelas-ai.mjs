// Kelaskan semua siaran yang belum dikelas AI (cth. selepas pertama kali mengaktifkan AI).
// Server mesti sedang berjalan. Guna: node scripts/kelas-ai.mjs [http://localhost:3000]
import { readFileSync } from "node:fs";

const base = process.argv[2] || "http://localhost:3000";
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);

const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ password: env.DASHBOARD_PASSWORD }),
});
if (!login.ok) {
  console.error("Log masuk gagal:", login.status, await login.text());
  process.exit(1);
}
const cookie = login.headers.get("set-cookie").split(";")[0];

let total = 0;
for (let round = 1; round <= 100; round++) {
  const t = Date.now();
  const res = await fetch(`${base}/api/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ limit: 1000 }),
  });
  const r = await res.json();
  if (!r.enabled) {
    console.log("AI tidak dikonfigurasi (LLM_BASE_URL / LLM_API_KEY).");
    break;
  }
  total += r.classified;
  console.log(
    `[${new Date().toLocaleTimeString()}] pusingan ${round}: +${r.classified} (jumlah ${total}), menunggu ${r.remaining}, ` +
      `kelompok gagal ${r.failedBatches}, ${Math.round((Date.now() - t) / 1000)}s` +
      (r.errors?.length ? ` | ${r.errors[0]}` : ""),
  );
  if (!r.ok || r.remaining === 0) break;
  if (r.classified === 0) {
    console.log("Tiada kemajuan, berhenti.");
    break;
  }
}
console.log("Selesai.");
