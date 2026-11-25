import { NextResponse, type NextRequest } from "next/server";
import { authConfig, SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

/** Laluan yang boleh diakses tanpa log masuk. */
function isPublic(req: NextRequest): boolean {
  const p = req.nextUrl.pathname;
  if (p === "/login" || p === "/api/auth/login") return true;
  // Penjadual harian: route itu sendiri menyemak Bearer CRON_SECRET.
  if (p === "/api/sync-drive" && req.method === "GET") return true;
  return false;
}

/** Tolak permintaan menukar data dari laman lain (CSRF). */
function crossOrigin(req: NextRequest): boolean {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return false;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== req.headers.get("host");
  } catch {
    return true;
  }
}

export async function proxy(req: NextRequest) {
  if (crossOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Permintaan merentas asal ditolak." }, { status: 403 });
  }
  if (isPublic(req)) return NextResponse.next();

  const cfg = authConfig();
  const ok = cfg ? await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value, cfg) : false;
  if (ok) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "Sila log masuk." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
