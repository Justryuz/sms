import type { ClassifyResult, IngestResult, SyncResult } from "./types";

async function readJson<T extends { ok: boolean; error?: string }>(res: Response): Promise<T> {
  if (res.status === 401) {
    // Muat semula penuh: buang semua keadaan klien selepas sesi tamat.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
    throw new Error("Sesi tamat. Sila log masuk semula.");
  }
  let data: T;
  try {
    data = (await res.json()) as T;
  } catch {
    throw new Error(`Respons pelayan tidak sah (${res.status}).`);
  }
  if (!res.ok || !data.ok) throw new Error(data.error ?? `Permintaan gagal (${res.status}).`);
  return data;
}

export async function importFiles(files: File[], crawlDate: string): Promise<IngestResult> {
  const form = new FormData();
  form.append("crawl_date", crawlDate);
  for (const f of files) form.append("files", f);
  return readJson<IngestResult>(await fetch("/api/ingest", { method: "POST", body: form }));
}

export async function syncGoogleDrive(): Promise<SyncResult> {
  return readJson<SyncResult>(
    await fetch("/api/sync-drive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    }),
  );
}

export async function classifyAi(limit = 500): Promise<ClassifyResult> {
  return readJson<ClassifyResult>(
    await fetch("/api/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit }),
    }),
  );
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  // Muat semula penuh supaya data dashboard tidak kekal dalam memori selepas log keluar.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = "/login";
}