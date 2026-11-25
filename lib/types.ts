export type Sentiment = "positif" | "negatif" | "neutral";

export interface SentimentRecord {
  id: string;
  external_id: string;
  /** YYYY-MM-DD */
  crawl_date: string;
  platform: string;
  content: string;
  sentiment: Sentiment;
  /** 0 hingga 1 */
  confidence_score: number;
  /** Siapa yang menentukan sentimen: model AI, pengelas kata kunci, atau label dalam fail asal */
  sentiment_source?: SentimentSource | null;
  keywords: string[];
  engagement_count: number;
  /** Pecahan interaksi (null = tiada dalam data sumber) */
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  created_at: string;

  // ---- Kategori (dikira semasa import; pilihan untuk rekod lama) ----
  /** slug komoditi, cth. "cili-padi" */
  commodity?: string | null;
  /** nama laman/platform asal, cth. "manamurah.com", "facebook" */
  source?: string | null;
  source_type?: SourceType | null;
  /** kod bahasa asal, cth. "ms", "en", "id" */
  lang?: string | null;
  topics?: string[];
  /** negeri yang disebut dalam teks */
  states?: string[];
  /** daerah/bandar yang disebut dalam teks */
  districts?: string[];
  /** YYYY-MM-DD tarikh siaran asal */
  posted_date?: string | null;
}

export type SourceType = "sosial" | "berita" | "peruncit";
export type SentimentSource = "ai" | "kata_kunci" | "label";

/** Satu baris fail db-curated: risiko & harga satu komoditi pada satu tarikh. */
export interface CommodityRisk {
  /** `${date}:${commodity}` */
  key: string;
  /** YYYY-MM-DD */
  date: string;
  /** slug, cth. "cili-padi" */
  commodity: string;
  risk_before: number | null;
  risk_current: number | null;
  risk_forward: number | null;
  band: string;
  sentiment_index: number | null;
  sample_n: number | null;
  price_label: string;
  price_value: number | null;
  price_unit: string;
  price_date: string | null;
  preliminary: boolean;
  analyst_note: string;
}

export type NewSentimentRecord = Omit<SentimentRecord, "id" | "created_at">;

export type DateRange = "today" | "7d" | "30d" | "all";
export type PlatformFilter = "all" | "x" | "tiktok" | "facebook" | "threads" | "instagram" | "web";

export type DimKey = "topic" | "lang" | "sourceType" | "group" | "state";

/** Nilai "all" = tiada tapisan */
export type CategoryFilters = Record<DimKey, string>;

export const NO_CATEGORY_FILTERS: CategoryFilters = {
  topic: "all",
  lang: "all",
  sourceType: "all",
  group: "all",
  state: "all",
};

export interface Filters {
  range: DateRange;
  platform: PlatformFilter;
  search: string;
  tag: string | null;
  cats: CategoryFilters;
}

export interface IngestResult {
  ok: boolean;
  received: number;
  skipped: number;
  inserted: number;
  updated: number;
  error?: string;
}

export interface SyncResult {
  ok: boolean;
  foldersScanned: number;
  filesProcessed: number;
  filesSkipped: number;
  newRecords: number;
  updatedRecords: number;
  /** Baris risiko komoditi (db-curated) yang disimpan */
  riskRows: number;
  skippedRows: number;
  partial: boolean;
  errors: string[];
  /** Pengelasan AI selepas sync */
  ai?: ClassifyResult;
  error?: string;
}

export interface ClassifyResult {
  ok: boolean;
  enabled: boolean;
  classified: number;
  /** Rekod yang masih menunggu pengelasan AI */
  remaining: number;
  failedBatches: number;
  errors: string[];
  error?: string;
}
