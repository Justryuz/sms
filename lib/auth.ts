/**
 * Sesi ringkas berasaskan kata laluan tunggal (DASHBOARD_PASSWORD).
 * Token: "v1.<expiry ms>.<HMAC-SHA256 base64url>", disimpan dalam cookie HttpOnly.
 * Kunci HMAC = AUTH_SECRET + kata laluan, jadi menukar kata laluan membatalkan semua sesi.
 * Guna Web Crypto supaya boleh dipanggil dari proxy dan route handler.
 */

export const SESSION_COOKIE = "sas_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const enc = new TextEncoder();

function b64url(buf: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function authConfig(): { password: string; secret: string } | null {
  const password = process.env.DASHBOARD_PASSWORD ?? "";
  const secret = process.env.AUTH_SECRET ?? "";
  if (password.length < 8 || secret.length < 16) return null;
  return { password, secret };
}

async function hmac(data: string, key: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return b64url(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}

/** Perbandingan masa-tetap untuk rentetan. */
export function safeEqual(a: string, b: string): boolean {
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/** Bandingkan kata laluan melalui hash supaya panjang tidak bocor melalui masa. */
export async function passwordMatches(input: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(input)),
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
  ]);
  return safeEqual(b64url(a), b64url(b));
}

export async function createSessionToken(cfg: { password: string; secret: string }): Promise<string> {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = `v1.${exp}`;
  return `${payload}.${await hmac(payload, `${cfg.secret}\n${cfg.password}`)}`;
}

export async function verifySessionToken(
  token: string | undefined,
  cfg: { password: string; secret: string },
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = await hmac(`v1.${parts[1]}`, `${cfg.secret}\n${cfg.password}`);
  return safeEqual(parts[2], expected);
}
