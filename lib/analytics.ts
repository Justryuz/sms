import { DIMENSIONS, optionLabel, UNKNOWN, type Dimension } from "./categories";
import { CRISIS_THRESHOLD } from "./constants";
import { buildNetwork, EMPTY_NETWORK, type Network } from "./network";
import { bandKey, commodityLabel, type BandKey } from "./commodity";
import type { CommodityRisk, DateRange, DimKey, Filters, Sentiment, SentimentRecord } from "./types";

export function toYmd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export interface Window {
  start: string | null;
  end: string;
  /** Bilangan hari dalam tempoh (null = semua rekod) */
  days: number | null;
  prevStart: string | null;
  prevEnd: string | null;
}

/** Tempoh yang sama panjang sejurus sebelum `start..end`, untuk perbandingan KPI. */
function withPrevious(start: string, end: string): Window {
  const days = daysBetween(start, end) + 1;
  return { start, end, days, prevStart: addDays(start, -days), prevEnd: addDays(start, -1) };
}

/**
 * Tukar pilihan tempoh kepada julat tarikh. `today` ialah tarikh data terkini.
 * Minggu semasa dipotong pada `today`, dan dibandingkan dengan hari yang sama pada minggu sebelumnya.
 */
export function dateWindow(range: DateRange, today: string): Window {
  switch (range.mode) {
    case "all":
      return { start: null, end: today, days: null, prevStart: null, prevEnd: null };
    case "today":
      return withPrevious(today, today);
    case "7d":
      return withPrevious(addDays(today, -6), today);
    case "30d":
      return withPrevious(addDays(today, -29), today);
    case "day":
      return withPrevious(range.date, range.date);
    case "week": {
      const full = addDays(range.start, 6);
      const end = full > today && range.start <= today ? today : full;
      // Banding dengan hari yang sama pada minggu sebelumnya (cth. Isnin–Rabu lawan Isnin–Rabu).
      return {
        start: range.start,
        end,
        days: daysBetween(range.start, end) + 1,
        prevStart: addDays(range.start, -7),
        prevEnd: addDays(end, -7),
      };
    }
    case "custom": {
      const [a, b] = range.start <= range.end ? [range.start, range.end] : [range.end, range.start];
      return withPrevious(a, b);
    }
  }
}

function inWindow(r: SentimentRecord, start: string | null, end: string | null) {
  return (start === null || r.crawl_date >= start) && (end === null || r.crawl_date <= end);
}

interface Summary {
  total: number;
  positif: number;
  negatif: number;
  neutral: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  byPlatform: Map<string, { posts: number; engagement: number }>;
}

function summarize(list: SentimentRecord[]): Summary {
  const s: Summary = {
    total: list.length,
    positif: 0,
    negatif: 0,
    neutral: 0,
    engagement: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    byPlatform: new Map(),
  };
  for (const r of list) {
    s[r.sentiment]++;
    s.engagement += r.engagement_count;
    s.likes += r.likes ?? 0;
    s.comments += r.comments ?? 0;
    s.shares += r.shares ?? 0;
    const p = s.byPlatform.get(r.platform) ?? { posts: 0, engagement: 0 };
    p.posts++;
    p.engagement += r.engagement_count;
    s.byPlatform.set(r.platform, p);
  }
  return s;
}

export interface PlatformEngagement {
  platform: string;
  posts: number;
  engagement: number;
  /** Purata interaksi setiap siaran */
  avg: number;
}

const pct = (n: number, total: number) => (total > 0 ? (n / total) * 100 : 0);

export interface Kpis {
  total: number;
  totalChange: number | null;
  positifPct: number;
  negatifPct: number;
  positifTrendUp: boolean;
  engagement: number;
  engagementChange: number | null;
  likes: number;
  comments: number;
  shares: number;
  /** Platform dengan interaksi, tertinggi dahulu */
  engagementByPlatform: PlatformEngagement[];
  crisis: boolean;
}

export interface TrendPoint {
  date: string;
  positif: number;
  neutral: number;
  negatif: number;
}

export interface BreakdownItem {
  key: Sentiment;
  value: number;
  percent: number;
}

export interface KeywordStat {
  tag: string;
  count: number;
  sentiment: Sentiment;
}

export interface CategoryStat {
  value: string;
  label: string;
  total: number;
  positif: number;
  neutral: number;
  negatif: number;
}

export interface CategoryBreakdown {
  stats: CategoryStat[];
  /** Bilangan siaran yang ada nilai diketahui untuk dimensi ini */
  known: number;
  /** Jumlah siaran yang dikira (tidak termasuk tapisan dimensi ini sendiri) */
  total: number;
}

export interface DistrictStat {
  name: string;
  count: number;
  negatif: number;
}

export interface Dashboard {
  kpis: Kpis;
  trend: TrendPoint[];
  breakdown: BreakdownItem[];
  keywords: KeywordStat[];
  feed: SentimentRecord[];
  categories: Record<DimKey, CategoryBreakdown>;
  districts: DistrictStat[];
  network: Network;
}

const emptyCategories = () =>
  Object.fromEntries(DIMENSIONS.map((d) => [d.key, { stats: [], known: 0, total: 0 }])) as unknown as Record<
    DimKey,
    CategoryBreakdown
  >;

export const EMPTY_DASHBOARD: Dashboard = {
  kpis: {
    total: 0,
    totalChange: null,
    positifPct: 0,
    negatifPct: 0,
    positifTrendUp: true,
    engagement: 0,
    engagementChange: null,
    likes: 0,
    comments: 0,
    shares: 0,
    engagementByPlatform: [],
    crisis: false,
  },
  trend: [],
  breakdown: [],
  keywords: [],
  feed: [],
  categories: emptyCategories(),
  districts: [],
  network: EMPTY_NETWORK,
};

export function buildDashboard(
  records: SentimentRecord[],
  filters: Filters,
  today: string,
): Dashboard {
  const win = dateWindow(filters.range, today);
  const q = filters.search.trim().toLowerCase();

  const base = (r: SentimentRecord) =>
    (filters.platform === "all" || r.platform === filters.platform) &&
    (!q ||
      r.content.toLowerCase().includes(q) ||
      r.keywords.some((k) => k.toLowerCase().includes(q)));

  // Penapis kategori aktif. Bagi setiap rekod, catat dimensi mana yang gagal.
  const active = DIMENSIONS.filter((d) => filters.cats[d.key] !== "all");
  const failing = (r: SentimentRecord): Dimension[] =>
    active.filter((d) => !d.values(r).includes(filters.cats[d.key]));

  const current: SentimentRecord[] = [];
  const previous: SentimentRecord[] = [];
  // Untuk carta kategori D: rekod yang lulus semua penapis kecuali D sendiri,
  // supaya carta masih menunjukkan pilihan lain apabila D sedang ditapis.
  const perDim = new Map<DimKey, SentimentRecord[]>(DIMENSIONS.map((d) => [d.key, []]));
  for (const r of records) {
    if (!base(r)) continue;
    const inCur = inWindow(r, win.start, win.end);
    const inPrev = !inCur && win.prevStart !== null && inWindow(r, win.prevStart, win.prevEnd);
    if (!inCur && !inPrev) continue;
    const fails = failing(r);
    if (inPrev) {
      if (fails.length === 0) previous.push(r);
      continue;
    }
    if (fails.length === 0) current.push(r);
    for (const d of DIMENSIONS) {
      if (fails.length === 0 || (fails.length === 1 && fails[0].key === d.key)) perDim.get(d.key)!.push(r);
    }
  }

  const categories = emptyCategories();
  for (const d of DIMENSIONS) {
    const list = perDim.get(d.key)!;
    const map = new Map<string, CategoryStat>();
    let known = 0;
    for (const r of list) {
      const vals = d.values(r);
      if (!vals.includes(UNKNOWN)) known++;
      for (const v of vals) {
        let s = map.get(v);
        if (!s) {
          s = { value: v, label: optionLabel(d.key, v), total: 0, positif: 0, neutral: 0, negatif: 0 };
          map.set(v, s);
        }
        s.total++;
        s[r.sentiment]++;
      }
    }
    const stats = [...map.values()].sort(
      (a, b) => (a.value === UNKNOWN ? 1 : 0) - (b.value === UNKNOWN ? 1 : 0) || b.total - a.total,
    );
    categories[d.key] = { stats, known, total: list.length };
  }

  const districtMap = new Map<string, DistrictStat>();
  for (const r of current) {
    for (const name of r.districts ?? []) {
      let s = districtMap.get(name);
      if (!s) {
        s = { name, count: 0, negatif: 0 };
        districtMap.set(name, s);
      }
      s.count++;
      if (r.sentiment === "negatif") s.negatif++;
    }
  }
  const districts = [...districtMap.values()].sort((a, b) => b.count - a.count).slice(0, 15);

  const cur = summarize(current);
  const prev = summarize(previous);
  const positifPct = pct(cur.positif, cur.total);
  const negatifPct = pct(cur.negatif, cur.total);

  const kpis: Kpis = {
    total: cur.total,
    totalChange:
      win.prevStart && prev.total > 0 ? ((cur.total - prev.total) / prev.total) * 100 : null,
    positifPct,
    negatifPct,
    positifTrendUp: prev.total === 0 || positifPct >= pct(prev.positif, prev.total),
    engagement: cur.engagement,
    engagementChange:
      win.prevStart && prev.engagement > 0 ? ((cur.engagement - prev.engagement) / prev.engagement) * 100 : null,
    likes: cur.likes,
    comments: cur.comments,
    shares: cur.shares,
    engagementByPlatform: [...cur.byPlatform.entries()]
      .filter(([, v]) => v.engagement > 0)
      .map(([platform, v]) => ({ platform, posts: v.posts, engagement: v.engagement, avg: v.engagement / v.posts }))
      .sort((a, b) => b.engagement - a.engagement),
    crisis: cur.total > 0 && negatifPct > CRISIS_THRESHOLD,
  };

  // Trend harian
  const byDate = new Map<string, TrendPoint>();
  if (win.start && (win.days ?? 0) > 1) {
    for (let d = win.start; d <= win.end; d = addDays(d, 1)) {
      byDate.set(d, { date: d, positif: 0, neutral: 0, negatif: 0 });
    }
  }
  for (const r of current) {
    let p = byDate.get(r.crawl_date);
    if (!p) {
      p = { date: r.crawl_date, positif: 0, neutral: 0, negatif: 0 };
      byDate.set(r.crawl_date, p);
    }
    p[r.sentiment]++;
  }
  const trend = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));

  const breakdown: BreakdownItem[] =
    cur.total === 0
      ? []
      : (["positif", "neutral", "negatif"] as const).map((key) => ({
          key,
          value: cur[key],
          percent: Math.round(pct(cur[key], cur.total)),
        }));

  // Kata kunci
  const kw = new Map<string, { tag: string; count: number; s: Record<Sentiment, number> }>();
  for (const r of current) {
    for (const k of r.keywords) {
      const key = k.toLowerCase();
      let e = kw.get(key);
      if (!e) {
        e = { tag: k, count: 0, s: { positif: 0, neutral: 0, negatif: 0 } };
        kw.set(key, e);
      }
      e.count++;
      e.s[r.sentiment]++;
    }
  }
  const keywords: KeywordStat[] = [...kw.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 24)
    .map((e) => ({
      tag: e.tag,
      count: e.count,
      sentiment: (Object.entries(e.s).sort((a, b) => b[1] - a[1])[0][0]) as Sentiment,
    }));

  // Suapan langsung
  const tag = filters.tag?.toLowerCase() ?? null;
  const feed = (tag ? current.filter((r) => r.keywords.some((k) => k.toLowerCase() === tag)) : current)
    .slice()
    .sort(
      (a, b) =>
        b.crawl_date.localeCompare(a.crawl_date) || b.created_at.localeCompare(a.created_at),
    );

  return { kpis, trend, breakdown, keywords, feed, categories, districts, network: buildNetwork(current) };
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

export interface RiskView extends CommodityRisk {
  label: string;
  bandKey: BandKey;
  /**
   * Diisi apabila penilaian terkini tidak mencukupi (cth. n=1, "tiada data") dan
   * baris ini memaparkan penilaian sah sebelumnya.
   */
  insufficientLatest: { date: string; sample_n: number | null } | null;
}

export interface RiskSummary {
  /** Tarikh data curated terkini dalam julat */
  asOf: string | null;
  rows: RiskView[];
  /** Komoditi band Merah (krisis) */
  red: string[];
  /** Komoditi band Kuning (perlu dipantau) */
  watch: string[];
}

const BAND_ORDER: Record<BandKey, number> = { merah: 0, kuning: 1, hijau: 2, tiada: 3 };

/** Penilaian sah: ada skor risiko semasa dan band bukan "tiada data". */
function isValidRisk(r: CommodityRisk): boolean {
  return r.risk_current !== null && bandKey(r.band, r.risk_current) !== "tiada";
}

/**
 * Penilaian terkini bagi setiap komoditi dalam julat tarikh.
 * Jika penilaian terkini tidak mencukupi, guna penilaian sah terakhir dalam julat
 * (untuk tempoh satu hari, cari sehingga 7 hari ke belakang) dan tandakan sebagai lama.
 */
export function buildRiskSummary(risks: CommodityRisk[], range: DateRange, today: string): RiskSummary {
  const { start, end } = dateWindow(range, today);
  const { days } = dateWindow(range, today);
  const fallbackStart = days === 1 ? addDays(end, -6) : start;

  const latest = new Map<string, CommodityRisk>();
  const latestValid = new Map<string, CommodityRisk>();
  for (const r of risks) {
    if (r.date > end) continue;
    if (!start || r.date >= start) {
      const prev = latest.get(r.commodity);
      if (!prev || r.date > prev.date) latest.set(r.commodity, r);
    }
    if (isValidRisk(r) && (!fallbackStart || r.date >= fallbackStart)) {
      const prev = latestValid.get(r.commodity);
      if (!prev || r.date > prev.date) latestValid.set(r.commodity, r);
    }
  }

  let asOf: string | null = null;
  for (const r of latest.values()) if (!asOf || r.date > asOf) asOf = r.date;

  const rows: RiskView[] = [...latest.values()]
    .map((l) => {
      const valid = latestValid.get(l.commodity);
      const useFallback = !isValidRisk(l) && valid !== undefined;
      const r = useFallback ? valid : l;
      return {
        ...r,
        label: commodityLabel(r.commodity),
        bandKey: bandKey(r.band, r.risk_current),
        insufficientLatest: useFallback ? { date: l.date, sample_n: l.sample_n } : null,
      };
    })
    .sort(
      (a, b) =>
        BAND_ORDER[a.bandKey] - BAND_ORDER[b.bandKey] ||
        (b.risk_current ?? -1) - (a.risk_current ?? -1) ||
        a.label.localeCompare(b.label),
    );
  return {
    asOf,
    rows,
    red: rows.filter((r) => r.bandKey === "merah").map((r) => r.label),
    watch: rows.filter((r) => r.bandKey === "kuning").map((r) => r.label),
  };
}
export const EMPTY_RISK: RiskSummary = { asOf: null, rows: [], red: [], watch: [] };