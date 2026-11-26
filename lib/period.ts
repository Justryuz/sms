import { addDays, daysBetween, type Window } from "./analytics";
import type { DateMode, DateRange } from "./types";

const MONTHS = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];

/** Hari dalam minggu, Isnin = 0 ... Ahad = 6. */
function weekday(ymd: string): number {
  return (new Date(`${ymd}T00:00:00Z`).getUTCDay() + 6) % 7;
}

/** Isnin bagi minggu yang mengandungi `ymd`. */
export function weekStart(ymd: string): string {
  return addDays(ymd, -weekday(ymd));
}

/** Nombor minggu ISO 8601 (minggu bermula Isnin; minggu 1 mengandungi Khamis pertama tahun itu). */
export function isoWeek(ymd: string): { year: number; week: number } {
  const thursday = addDays(ymd, 3 - weekday(ymd));
  const year = Number(thursday.slice(0, 4));
  return { year, week: Math.floor(daysBetween(`${year}-01-01`, thursday) / 7) + 1 };
}

/** "24 Nov 2026" */
export function formatDay(ymd: string, withYear = true): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}${withYear ? ` ${y}` : ""}`;
}

/** "17–23 Nov 2026", "28 Okt – 3 Nov 2026", "24 Nov 2026" */
export function formatSpan(start: string, end: string): string {
  if (start === end) return formatDay(start);
  const [ys, ms] = start.split("-");
  const [ye, me, de] = end.split("-");
  if (ys === ye && ms === me) return `${Number(start.slice(8))}–${Number(de)} ${MONTHS[Number(me) - 1]} ${ye}`;
  if (ys === ye) return `${formatDay(start, false)} – ${formatDay(end)}`;
  return `${formatDay(start)} – ${formatDay(end)}`;
}

export interface WeekOption {
  /** Isnin */
  start: string;
  end: string;
  label: string;
}

/** Senarai minggu dari `min` hingga `max`, terbaru dahulu. */
export function listWeeks(min: string, max: string): WeekOption[] {
  const out: WeekOption[] = [];
  for (let s = weekStart(max); s >= weekStart(min); s = addDays(s, -7)) {
    const end = addDays(s, 6);
    const { week } = isoWeek(s);
    out.push({ start: s, end, label: `Minggu ${week} · ${formatSpan(s, end)}` });
  }
  return out;
}

/** Tempoh lalai apabila pengguna menukar mod. */
export function defaultRange(mode: DateMode, today: string): DateRange {
  switch (mode) {
    case "day":
      return { mode, date: today };
    case "week":
      return { mode, start: weekStart(today) };
    case "custom":
      return { mode, start: addDays(today, -6), end: today };
    default:
      return { mode };
  }
}

/** Anjak tempoh satu langkah ke belakang (-1) atau ke hadapan (+1). */
export function shiftRange(range: DateRange, dir: -1 | 1): DateRange {
  switch (range.mode) {
    case "day":
      return { ...range, date: addDays(range.date, dir) };
    case "week":
      return { ...range, start: addDays(range.start, 7 * dir) };
    case "custom": {
      const len = daysBetween(range.start, range.end) + 1;
      return { ...range, start: addDays(range.start, len * dir), end: addDays(range.end, len * dir) };
    }
    default:
      return range;
  }
}

/** Kunci rentetan yang stabil untuk tempoh (cth. untuk React `key`). */
export function rangeKey(range: DateRange): string {
  switch (range.mode) {
    case "day":
      return `day:${range.date}`;
    case "week":
      return `week:${range.start}`;
    case "custom":
      return `custom:${range.start}:${range.end}`;
    default:
      return range.mode;
  }
}

/** Ringkasan tempoh yang sedang dipaparkan dan tempoh perbandingan. */
export function describeWindow(win: Window): { current: string; previous: string | null } | null {
  if (!win.start) return null;
  const days = win.days ?? 1;
  return {
    current: `${formatSpan(win.start, win.end)}${days > 1 ? ` (${days} hari)` : ""}`,
    previous: win.prevStart && win.prevEnd ? formatSpan(win.prevStart, win.prevEnd) : null,
  };
}
