import type { Sentiment } from "./types";

/**
 * Pengelas sentimen berasaskan leksikon untuk sebutan pasaran komoditi pertanian
 * (BM, Inggeris, Indonesia). Dari sudut pengguna/pasaran:
 *  - positif: promosi, harga turun/murah, bekalan mencukupi, segar
 *  - negatif: harga naik/mahal, kekurangan bekalan, rosak, banjir, penyakit, aduan
 * Ini heuristik, bukan model AI. Gantikan dengan model sebenar jika ada.
 */

const POSITIVE: RegExp[] = [
  /\b(special\s+)?offers?\b/gi,
  /\bpromo(si|tion|tions|tional)?\b/gi,
  /\bdiskaun|discount(s|ed)?\b/gi,
  /\b(jualan\s+)?murah|cheap(er|est)?\b/gi,
  /\bjimat|save|saving(s)?\b/gi,
  /\btawaran|sale\b/gi,
  /\b(harga|price[s]?)\s+(turun|menurun|jatuh|drop(s|ped)?|fall(s|en)?|decrease[sd]?|lower)\b/gi,
  /\bturun\b/gi,
  /\b(lower|affordable|berpatutan|reasonable)\b/gi,
  /\b(segar|fresh)\b/gi,
  /\b(bekalan\s+(mencukupi|stabil|banyak)|stable|stabil|abundant|plentiful|lambak)\b/gi,
  /\b(berkualiti|high[-\s]quality|premium|best|terbaik|sedap|delicious)\b/gi,
  /\b(panen\s+raya|bumper|hasil\s+tinggi)\b/gi,
];

const NEGATIVE: RegExp[] = [
  /\b(harga|price[s]?)\s+(naik|meningkat|melambung|melonjak|rise[sn]?|rising|increase[sd]?|surge[sd]?|soar(s|ed|ing)?|hike[sd]?|up)\b/gi,
  /\b(kenaikan|increase|rise|hike|surge)\s+(harga|in\s+(the\s+)?price[s]?)\b/gi,
  /\bnaik\b/gi,
  /\b(mahal|expensive|costly|pricey)\b/gi,
  /\b(kekurangan|shortage[s]?|scarce|scarcity|langka|terhad|limited\s+supply|out\s+of\s+stock|habis\s+stok)\b/gi,
  /\b(rosak|busuk|rotten|spoil(ed|t)?|damaged|layu|wilted)\b/gi,
  /\b(banjir|flood(s|ed|ing)?|kemarau|drought|tengkujuh|monsoon)\b/gi,
  /\b(penyakit|disease[sd]?|wabak|outbreak|serangan\s+perosak|pest[s]?)\b/gi,
  /\b(rugi|kerugian|loss(es)?|gagal\s+panen|crop\s+failure|terjejas|affected)\b/gi,
  /\b(aduan|complain(t|ts|ed)?|kecewa|disappoint(ed|ing)?|marah|angry)\b/gi,
  /\b(sorok|hoard(ing)?|catut|profiteer(ing)?|manipulasi)\b/gi,
];

function count(text: string, patterns: RegExp[]): number {
  let n = 0;
  for (const re of patterns) n += text.match(re)?.length ?? 0;
  return n;
}

export function classifySentiment(text: string): { sentiment: Sentiment; confidence: number } {
  const pos = count(text, POSITIVE);
  const neg = count(text, NEGATIVE);
  const total = pos + neg;
  if (total === 0) return { sentiment: "neutral", confidence: 0.55 };
  if (pos === neg) return { sentiment: "neutral", confidence: 0.5 };
  const margin = Math.abs(pos - neg) / total;
  const confidence = Math.round((0.55 + 0.4 * margin * Math.min(1, total / 3)) * 100) / 100;
  return { sentiment: pos > neg ? "positif" : "negatif", confidence };
}
