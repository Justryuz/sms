import type { DimKey, SentimentRecord } from "./types";

export const UNKNOWN = "unknown";

export interface DimOption {
  value: string;
  label: string;
}

export interface Dimension {
  key: DimKey;
  /** Label penapis / tab */
  label: string;
  /** Label pilihan "semua" dalam dropdown */
  allLabel: string;
  options: DimOption[];
  /** Nilai kategori bagi satu rekod (boleh lebih daripada satu, cth. topik) */
  values: (r: SentimentRecord) => string[];
  /** Nota penerangan di bawah carta */
  note?: string;
}

// ---------- Kumpulan komoditi ----------

const GROUP_OF: Record<string, string> = {
  sawi: "sayur",
  kangkung: "sayur",
  bayam: "sayur",
  kubis: "sayur",
  timun: "sayur",
  terung: "sayur",
  bendi: "sayur",
  "kacang-panjang": "sayur",
  tomato: "sayur",
  durian: "buah",
  tembikai: "buah",
  "kelapa-tua": "buah",
  ayam: "protein",
  telur: "protein",
  "cili-padi": "rempah",
  "cili-merah-hijau": "rempah",
  bawang: "rempah",
};

function commodityOf(r: SentimentRecord): string | null {
  if (r.commodity) return r.commodity;
  const k = r.keywords[0];
  return k?.startsWith("#") ? k.slice(1).toLowerCase() : null;
}

export function commodityGroup(r: SentimentRecord): string {
  const c = commodityOf(r);
  return (c && GROUP_OF[c]) || "lain";
}

// ---------- Bahasa ----------

function langGroup(lang: string | null | undefined): string {
  const l = (lang ?? "").toLowerCase();
  if (!l) return UNKNOWN;
  if (l === "ms" || l === "may" || l === "zsm") return "ms";
  if (l === "en") return "en";
  if (l === "id" || l === "jv" || l === "su" || l === "ind") return "id";
  if (l.startsWith("zh")) return "zh";
  if (l === "ta") return "ta";
  return "lain";
}

// ---------- Senarai dimensi ----------

export const DIMENSIONS: Dimension[] = [
  {
    key: "topic",
    label: "Topik / Punca Isu",
    allLabel: "Semua topik",
    options: [
      { value: "harga", label: "Harga" },
      { value: "bekalan", label: "Bekalan" },
      { value: "promosi", label: "Promosi" },
      { value: "kualiti", label: "Kualiti" },
      { value: "cuaca", label: "Cuaca / Bencana" },
      { value: "dasar", label: "Dasar Kerajaan" },
      { value: "lain", label: "Lain-lain" },
    ],
    values: (r) => (r.topics?.length ? r.topics : [UNKNOWN]),
    note: "Satu siaran boleh mempunyai lebih daripada satu topik.",
  },
  {
    key: "lang",
    label: "Bahasa",
    allLabel: "Semua bahasa",
    options: [
      { value: "ms", label: "Bahasa Melayu" },
      { value: "en", label: "Inggeris" },
      { value: "id", label: "Indonesia / Jawa / Sunda" },
      { value: "zh", label: "Cina" },
      { value: "ta", label: "Tamil" },
      { value: "lain", label: "Lain-lain" },
      { value: UNKNOWN, label: "Tidak diketahui" },
    ],
    values: (r) => [langGroup(r.lang)],
  },
  {
    key: "sourceType",
    label: "Jenis Sumber",
    allLabel: "Semua sumber",
    options: [
      { value: "sosial", label: "Media sosial" },
      { value: "berita", label: "Berita / Laman web" },
      { value: "peruncit", label: "Peruncit / Laman harga" },
      { value: UNKNOWN, label: "Tidak diketahui" },
    ],
    values: (r) => [r.source_type ?? UNKNOWN],
  },
  {
    key: "group",
    label: "Kumpulan Komoditi",
    allLabel: "Semua kumpulan",
    options: [
      { value: "sayur", label: "Sayur-sayuran" },
      { value: "buah", label: "Buah-buahan" },
      { value: "protein", label: "Protein (ayam, telur)" },
      { value: "rempah", label: "Rempah (cili, bawang)" },
      { value: "lain", label: "Lain-lain" },
    ],
    values: (r) => [commodityGroup(r)],
  },
  {
    key: "state",
    label: "Negeri",
    allLabel: "Semua negeri",
    options: [
      "Johor",
      "Kedah",
      "Kelantan",
      "Melaka",
      "Negeri Sembilan",
      "Pahang",
      "Perak",
      "Perlis",
      "Pulau Pinang",
      "Sabah",
      "Sarawak",
      "Selangor",
      "Terengganu",
      "WP Kuala Lumpur",
      "WP Putrajaya",
      "WP Labuan",
      "Luar negara",
    ]
      .map((s) => ({ value: s, label: s }))
      .concat([{ value: UNKNOWN, label: "Tidak disebut" }]),
    values: (r) => (r.states?.length ? r.states : [UNKNOWN]),
    note: "Negeri yang disebut dalam teks siaran (lokasi isu atau kedai), bukan lokasi penulis.",
  },
];

export const DIM_BY_KEY = Object.fromEntries(DIMENSIONS.map((d) => [d.key, d])) as Record<DimKey, Dimension>;

export function optionLabel(dim: DimKey, value: string): string {
  return DIM_BY_KEY[dim].options.find((o) => o.value === value)?.label ?? value;
}
