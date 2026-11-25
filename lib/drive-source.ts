import "server-only";
import { google, type drive_v3 } from "googleapis";

export interface DriveEntry {
  id: string;
  name: string;
  isFolder: boolean;
  /** Penanda perubahan (ISO modifiedTime dengan API, label "Oct 7"/"6:02pm" dalam mod awam). */
  modified: string | null;
}

export interface DriveSource {
  kind: "api" | "public";
  list(folderId: string): Promise<DriveEntry[]>;
  read(entry: DriveEntry): Promise<string>;
}

const FOLDER_MIME = "application/vnd.google-apps.folder";
const SHEET_MIME = "application/vnd.google-apps.spreadsheet";
const ID_RE = /^[\w-]+$/;

// ---------- Google Drive API v3 (service account / API key) ----------

function apiSource(drive: drive_v3.Drive): DriveSource {
  const mimes = new Map<string, string>();
  return {
    kind: "api",
    async list(folderId) {
      const out: DriveEntry[] = [];
      let pageToken: string | undefined;
      do {
        const res = await drive.files.list({
          q: `'${folderId}' in parents and trashed = false`,
          pageSize: 1000,
          pageToken,
          fields: "nextPageToken, files(id, name, mimeType, modifiedTime)",
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });
        for (const f of res.data.files ?? []) {
          if (!f.id || !f.name) continue;
          if (f.mimeType) mimes.set(f.id, f.mimeType);
          out.push({ id: f.id, name: f.name, isFolder: f.mimeType === FOLDER_MIME, modified: f.modifiedTime ?? null });
        }
        pageToken = res.data.nextPageToken ?? undefined;
      } while (pageToken);
      return out;
    },
    async read(entry) {
      if (mimes.get(entry.id) === SHEET_MIME) {
        const res = await drive.files.export({ fileId: entry.id, mimeType: "text/csv" }, { responseType: "text" });
        return String(res.data);
      }
      const res = await drive.files.get(
        { fileId: entry.id, alt: "media", supportsAllDrives: true },
        { responseType: "text" },
      );
      return typeof res.data === "string" ? res.data : JSON.stringify(res.data);
    },
  };
}

// ---------- Folder awam ("Anyone with the link"), tanpa kunci ----------

function decodeHtml(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Pecahkan HTML kepada satu blok setiap entri supaya ID dan nama tidak bercampur antara entri. */
function parseEntries(html: string): DriveEntry[] {
  const out: DriveEntry[] = [];
  for (const block of html.split('<div class="flip-entry" ').slice(1)) {
    const id = /^id="entry-([\w-]+)"/.exec(block)?.[1];
    const name = /<div class="flip-entry-title">([^<]*)<\/div>/.exec(block)?.[1];
    if (!id || name === undefined) continue;
    const href = /<a href="([^"]*)"/.exec(block)?.[1] ?? "";
    const modified = /<div class="flip-entry-last-modified"><div>([^<]*)<\/div>/.exec(block)?.[1] ?? null;
    out.push({ id, name: decodeHtml(name).trim(), isFolder: href.includes("/drive/folders/"), modified });
  }
  return out;
}

const publicSource: DriveSource = {
  kind: "public",
  async list(folderId) {
    if (!ID_RE.test(folderId)) throw new Error("ID folder tidak sah.");
    const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${folderId}`, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(
        `Folder Drive tidak boleh dibaca secara awam (${res.status}). Kongsi sebagai "Anyone with the link" atau tetapkan GOOGLE_API_KEY.`,
      );
    }
    const html = await res.text();
    const out = parseEntries(html);
    if (out.length === 0 && /flip-entry/.test(html)) throw new Error("Format senarai Drive awam tidak dikenali.");
    return out;
  },
  async read(entry) {
    if (!ID_RE.test(entry.id)) throw new Error("ID fail tidak sah.");
    const res = await fetch(`https://drive.google.com/uc?export=download&id=${entry.id}`, {
      cache: "no-store",
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`Muat turun gagal (${res.status}).`);
    const type = res.headers.get("content-type") ?? "";
    const text = await res.text();
    if (type.includes("text/html") && /<html/i.test(text.slice(0, 500))) {
      throw new Error("Drive memulangkan halaman HTML (fail terlalu besar atau tidak dikongsi awam).");
    }
    return text;
  },
};

/**
 * Pilih sumber: service account > API key > folder awam tanpa kunci.
 * Mod awam membaca halaman senarai Drive dan sesuai untuk folder "Anyone with the link".
 */
export function getDriveSource(): DriveSource {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.trim();
  const apiKey = process.env.GOOGLE_API_KEY?.trim();
  if (raw) {
    const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    let credentials: Record<string, unknown>;
    try {
      credentials = JSON.parse(json) as Record<string, unknown>;
    } catch {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY tidak sah (mesti JSON atau base64 JSON).");
    }
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
    return apiSource(google.drive({ version: "v3", auth }));
  }
  if (apiKey) return apiSource(google.drive({ version: "v3", auth: apiKey }));
  return publicSource;
}
