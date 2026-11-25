import type { DateRange, PlatformFilter, Sentiment } from "./types";

export const TABLE = "sentiment_records";
export const CRISIS_THRESHOLD = 30; // peratus sentimen negatif

export const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "today", label: "Hari Ini" },
  { value: "7d", label: "7 Hari Lepas" },
  { value: "30d", label: "30 Hari Lepas" },
  { value: "all", label: "Semua Rekod (Termasuk Historical)" },
];

export const PLATFORM_OPTIONS: { value: PlatformFilter; label: string }[] = [
  { value: "all", label: "Semua Platform (X, TikTok, FB, Threads)" },
  { value: "x", label: "X (Twitter)" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook", label: "Facebook" },
  { value: "threads", label: "Threads" },
  { value: "instagram", label: "Instagram" },
  { value: "web", label: "Web / Berita" },
];

export const PLATFORM_META: Record<
  string,
  { label: string; short: string; className: string }
> = {
  x: { label: "X", short: "X", className: "bg-slate-900 text-white" },
  tiktok: { label: "TikTok", short: "TT", className: "bg-pink-50 text-pink-700 ring-pink-200" },
  facebook: { label: "Facebook", short: "FB", className: "bg-blue-50 text-blue-700 ring-blue-200" },
  threads: { label: "Threads", short: "@", className: "bg-violet-50 text-violet-700 ring-violet-200" },
  instagram: { label: "Instagram", short: "IG", className: "bg-orange-50 text-orange-700 ring-orange-200" },
  web: { label: "Web", short: "WWW", className: "bg-teal-50 text-teal-700 ring-teal-200" },
};

export function platformMeta(platform: string) {
  return (
    PLATFORM_META[platform] ?? {
      label: platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : "Lain-lain",
      short: "?",
      className: "bg-slate-100 text-slate-700 ring-slate-200",
    }
  );
}

export const SENTIMENT_META: Record<
  Sentiment,
  { label: string; color: string; pill: string }
> = {
  positif: {
    label: "Positif",
    color: "#10B981",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  neutral: {
    label: "Neutral",
    color: "#64748B",
    pill: "bg-slate-100 text-slate-700 ring-slate-200",
  },
  negatif: {
    label: "Negatif",
    color: "#EF4444",
    pill: "bg-red-50 text-red-700 ring-red-200",
  },
};
