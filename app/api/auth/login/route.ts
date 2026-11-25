import type { NextRequest } from "next/server";
import { authConfig, createSessionToken, passwordMatches, SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/auth";

const MAX_FAILS = 5;
const WINDOW_MS = 10 * 60 * 1000;
const fails = new Map<string, { count: number; until: number }>();

function clientKey(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

export async function POST(req: NextRequest) {
  const cfg = authConfig();
  if (!cfg) {
    return Response.json(
      {
        ok: false,
        error: "DASHBOARD_PASSWORD (min 8 aksara) dan AUTH_SECRET (min 16 aksara) belum ditetapkan dalam .env.local.",
      },
      { status: 503 },
    );
  }

  const key = clientKey(req);
  const now = Date.now();
  const f = fails.get(key);
  if (f && f.until > now && f.count >= MAX_FAILS) {
    const mins = Math.ceil((f.until - now) / 60000);
    return Response.json({ ok: false, error: `Terlalu banyak cubaan. Cuba lagi dalam ${mins} minit.` }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as { password?: unknown };
  const password = typeof body.password === "string" ? body.password.slice(0, 200) : "";

  if (!(await passwordMatches(password, cfg.password))) {
    const entry = f && f.until > now ? f : { count: 0, until: now + WINDOW_MS };
    entry.count++;
    fails.set(key, entry);
    return Response.json({ ok: false, error: "Kata laluan salah." }, { status: 401 });
  }

  fails.delete(key);
  const res = Response.json({ ok: true });
  const secure = req.nextUrl.protocol === "https:";
  res.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${await createSessionToken(cfg)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(
      SESSION_TTL_MS / 1000,
    )}${secure ? "; Secure" : ""}`,
  );
  return res;
}
