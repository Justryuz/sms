import type { SourceType } from "./types";

/**
 * Pengelasan kategori untuk setiap siaran (dijalankan semasa import/sync).
 * Semua berasaskan peraturan kata kunci, jadi ia boleh diaudit dan diubah di sini.
 */

// ---------- Topik / punca isu ----------

const TOPIC_RULES: [string, RegExp][] = [
  [
    "harga",
    /\b(harga|price[sd]?|pricing|murah|mahal|cheap|expensive|kenaikan|naik|turun|cost|rm\s?\d|sekilo|per\s?kg|\/kg|pricecatcher)\b/i,
  ],
  [
    "bekalan",
    /\b(bekalan|supply|supplies|stok|stock|kekurangan|shortage|import(ed|s)?|eksport|export(ed|s)?|lambakan|pengeluaran|production|hasil|tuai(an)?|harvest(ed|ing)?|panen|langka|ladang|farm(s|ers?)?|kebun|pekebun)\b/i,
  ],
  [
    "promosi",
    /\b(promo(si|tion|tions)?|offer[s]?|tawaran|diskaun|discount(s|ed)?|sale|jualan|special|deal[s]?|voucher|baucar|beli\s?\d|buy\s?\d|flash)\b/i,
  ],
  ["kualiti", /\b(segar|fresh|busuk|rosak|rotten|spoil(ed|t)?|kualiti|quality|gred|grade|organik|organic|layu|premium)\b/i],
  [
    "cuaca",
    /\b(banjir|flood(s|ed|ing)?|hujan|rain(s|y|fall)?|kemarau|drought|monsoon|tengkujuh|cuaca|weather|el\s?nino|la\s?nina|ribut|storm|gelombang\s+haba|heatwave|bencana|disaster)\b/i,
  ],
  [
    "dasar",
    /\b(kerajaan|government|kpdn|kpkm|fama|mardi|maqis|kementerian|ministry|menteri|minister|subsidi|subsidy|subsidies|harga\s+siling|ceiling\s+price|larangan|ban(ned)?|dasar|policy|permit|kawalan|regulat(ion|ed)|skim|scheme|parlimen|parliament)\b/i,
  ],
];

export function classifyTopics(text: string): string[] {
  const out = TOPIC_RULES.filter(([, re]) => re.test(text)).map(([k]) => k);
  return out.length > 0 ? out : ["lain"];
}

// ---------- Bahasa ----------

export function normalizeLang(raw: unknown): string | null {
  const s = String(raw ?? "").trim().toLowerCase().slice(0, 10);
  return s || null;
}

// ---------- Jenis sumber ----------

const SOCIAL = new Set(["facebook", "instagram", "threads", "tiktok", "x", "youtube"]);
const RETAIL =
  /(manamurah|lotuss|lotus's|hargakita|hargasekilo|zscommerce|midas|borong|tridge|spikedurian|mydin|aeon|jaya\s?grocer|tesco|shopee|lazada|grabmart|foodpanda|econsave|giant|nsk|everrise|village\s?grocer|pasaraya|hypermarket|supermarket|mart\b|kedai)/i;

export function classifySourceType(platform: string, source: string): SourceType {
  if (SOCIAL.has(platform)) return "sosial";
  return RETAIL.test(source) ? "peruncit" : "berita";
}

/** Nama sumber daripada URL (hostname tanpa www) atau nilai platform asal. */
export function sourceName(url: unknown, rawPlatform: unknown): string | null {
  const u = String(url ?? "").trim();
  if (/^https?:\/\//i.test(u)) {
    try {
      return new URL(u).hostname.replace(/^www\./i, "").toLowerCase().slice(0, 80);
    } catch {
      /* abaikan */
    }
  }
  const p = String(rawPlatform ?? "").trim().toLowerCase();
  return p ? p.slice(0, 80) : null;
}

// ---------- Lokasi (negeri / daerah) ----------

/** [nama kanonik daerah/bandar, negeri, corak tambahan] */
const PLACES: [string, string, string?][] = [
  // Johor
  ["Johor Bahru", "Johor", "johor bahru|johor baharu|\\bJB\\b"], ["Muar", "Johor"], ["Batu Pahat", "Johor"],
  ["Kluang", "Johor"], ["Segamat", "Johor"], ["Mersing", "Johor"], ["Pontian", "Johor"], ["Kota Tinggi", "Johor"],
  // "cili merah Kulai" ialah nama varieti cili, bukan lokasi.
  ["Kulai", "Johor", "(?<!(?:cili|chil+i|merah)[\\s-]+(?:merah[\\s-]+)?)kulai(?![\\s-]+(?:hybrid|hibrid|and\\s+minyak|dan\\s+minyak))"], ["Tangkak", "Johor"], ["Pasir Gudang", "Johor"], ["Iskandar Puteri", "Johor"],
  // Kedah
  ["Alor Setar", "Kedah", "alor setar|alor star"], ["Sungai Petani", "Kedah"], ["Kulim", "Kedah"],
  ["Langkawi", "Kedah"], ["Jitra", "Kedah"], ["Pendang", "Kedah"], ["Kubang Pasu", "Kedah"],
  // Kelantan
  ["Kota Bharu", "Kelantan", "kota bharu|kota baru"], ["Pasir Mas", "Kelantan"], ["Tumpat", "Kelantan"],
  ["Tanah Merah", "Kelantan"], ["Machang", "Kelantan"], ["Gua Musang", "Kelantan"], ["Kuala Krai", "Kelantan"],
  ["Bachok", "Kelantan"], ["Pasir Puteh", "Kelantan"],
  // Melaka
  ["Alor Gajah", "Melaka"], ["Jasin", "Melaka"], ["Ayer Keroh", "Melaka"],
  // Negeri Sembilan
  ["Seremban", "Negeri Sembilan"], ["Port Dickson", "Negeri Sembilan"],
  ["Kuala Pilah", "Negeri Sembilan"], ["Rembau", "Negeri Sembilan"], ["Jempol", "Negeri Sembilan"],
  ["Tampin", "Negeri Sembilan"], ["Jelebu", "Negeri Sembilan"],
  // Pahang
  ["Kuantan", "Pahang"], ["Temerloh", "Pahang"], ["Bentong", "Pahang"],
  ["Cameron Highlands", "Pahang", "cameron highlands|cameron"], ["Raub", "Pahang"], ["Jerantut", "Pahang"],
  ["Rompin", "Pahang"], ["Maran", "Pahang"], ["Lipis", "Pahang"], ["Bera", "Pahang"],
  // Perak
  ["Ipoh", "Perak"], ["Taiping", "Perak"], ["Teluk Intan", "Perak"], ["Kampar", "Perak"], ["Batu Gajah", "Perak"],
  ["Manjung", "Perak", "manjung|lumut|sitiawan"], ["Kuala Kangsar", "Perak"], ["Gerik", "Perak", "gerik|grik"],
  ["Tapah", "Perak"], ["Bagan Datuk", "Perak"], ["Kinta", "Perak"],
  // Perlis
  ["Kangar", "Perlis"], ["Arau", "Perlis"], ["Padang Besar", "Perlis"],
  // Pulau Pinang
  ["George Town", "Pulau Pinang", "george\\s?town"], ["Butterworth", "Pulau Pinang"],
  ["Bukit Mertajam", "Pulau Pinang"], ["Seberang Perai", "Pulau Pinang"], ["Bayan Lepas", "Pulau Pinang"],
  ["Balik Pulau", "Pulau Pinang"], ["Nibong Tebal", "Pulau Pinang"],
  // Sabah
  ["Kota Kinabalu", "Sabah"], ["Sandakan", "Sabah"], ["Tawau", "Sabah"], ["Lahad Datu", "Sabah"],
  ["Keningau", "Sabah"], ["Semporna", "Sabah"], ["Kudat", "Sabah"], ["Ranau", "Sabah"], ["Beaufort", "Sabah"],
  ["Penampang", "Sabah"], ["Tuaran", "Sabah"], ["Kota Belud", "Sabah"], ["Kunak", "Sabah"],
  // Sarawak
  ["Kuching", "Sarawak"], ["Miri", "Sarawak"], ["Sibu", "Sarawak"], ["Bintulu", "Sarawak"], ["Sri Aman", "Sarawak"],
  ["Sarikei", "Sarawak"], ["Mukah", "Sarawak"], ["Limbang", "Sarawak"],
  ["Samarahan", "Sarawak"], ["Serian", "Sarawak"], ["Lawas", "Sarawak"],
  // Selangor
  ["Shah Alam", "Selangor"], ["Petaling Jaya", "Selangor", "petaling jaya|\\bPJ\\b"], ["Petaling", "Selangor"],
  ["Subang Jaya", "Selangor", "subang"], ["Klang", "Selangor"], ["Kajang", "Selangor"], ["Hulu Langat", "Selangor"],
  ["Sepang", "Selangor"], ["Kuala Selangor", "Selangor"], ["Sabak Bernam", "Selangor"], ["Gombak", "Selangor"],
  ["Rawang", "Selangor"], ["Kuala Langat", "Selangor"], ["Banting", "Selangor"], ["Puchong", "Selangor"],
  ["Cyberjaya", "Selangor"], ["Selayang", "Selangor"], ["Ampang", "Selangor"], ["Semenyih", "Selangor"],
  // Terengganu
  ["Kuala Terengganu", "Terengganu"], ["Dungun", "Terengganu"], ["Kemaman", "Terengganu", "kemaman|chukai"],
  ["Besut", "Terengganu"], ["Marang", "Terengganu"], ["Hulu Terengganu", "Terengganu"], ["Setiu", "Terengganu"],
  ["Kuala Nerus", "Terengganu"],
  // Wilayah
  ["Kuala Lumpur", "WP Kuala Lumpur", "kuala lumpur|\\bKL\\b"], ["Putrajaya", "WP Putrajaya"], ["Labuan", "WP Labuan"],
];

/** Nama negeri sahaja (tanpa daerah) */
const STATE_PATTERNS: [string, string][] = [
  ["Johor", "johor"], ["Kedah", "kedah"], ["Kelantan", "kelantan"], ["Melaka", "melaka|malacca"],
  ["Negeri Sembilan", "negeri sembilan|n\\.\\s?sembilan"], ["Pahang", "pahang"], ["Perak", "\\bPerak\\b"],
  ["Perlis", "perlis"], ["Pulau Pinang", "pulau pinang|penang"], ["Sabah", "sabah"], ["Sarawak", "sarawak"],
  ["Selangor", "selangor|lembah klang|klang valley"], ["Terengganu", "terengganu"],
];

// China dan India tidak dimasukkan: dalam data ini ia kebanyakannya nama produk
// ("kobis bulat China", "bawang India"), bukan lokasi isu.
const FOREIGN = /\b(indonesia|jakarta|bandung|surabaya|jawa|sumatera|sumatra|singapore|singapura|thailand|bangkok|vietnam|philippines|filipina)\b/i;

const LETTER = "\\p{L}";

function compile(name: string, extra?: string): { ci: RegExp; cs: RegExp | null } {
  // Corak bermula "\\b" dengan huruf besar (\\bKL\\b, \\bJB\\b, \\bPerak\\b) dipadankan sensitif huruf,
  // supaya perkataan biasa seperti "perak" (logam) atau "kl" tidak terkena.
  const parts = (extra ?? name.toLowerCase()).split("|");
  const caseSensitive = parts.filter((p) => p.startsWith("\\b") && /[A-Z]/.test(p));
  const insensitive = parts.filter((p) => !caseSensitive.includes(p));
  const wrap = (ps: string[]) => `(?<!${LETTER})(?:${ps.join("|")})(?!${LETTER})`;
  return {
    ci: insensitive.length ? new RegExp(wrap(insensitive), "iu") : /(?!)/,
    cs: caseSensitive.length ? new RegExp(caseSensitive.join("|"), "u") : null,
  };
}

const COMPILED_PLACES = PLACES.map(([name, state, extra]) => ({ name, state, ...compile(name, extra) }));
const COMPILED_STATES = STATE_PATTERNS.map(([state, pattern]) => ({ state, ...compile(state, pattern) }));

export const FOREIGN_STATE = "Luar negara";

export function detectLocations(text: string): { states: string[]; districts: string[] } {
  const states = new Set<string>();
  const districts = new Set<string>();
  for (const p of COMPILED_PLACES) {
    if (p.ci.test(text) || (p.cs?.test(text) ?? false)) {
      districts.add(p.name);
      states.add(p.state);
    }
  }
  for (const s of COMPILED_STATES) if (s.ci.test(text) || (s.cs?.test(text) ?? false)) states.add(s.state);
  if (FOREIGN.test(text)) states.add(FOREIGN_STATE);
  return { states: [...states], districts: [...districts] };
}
