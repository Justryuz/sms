import { optionLabel } from "./categories";
import { commodityLabel } from "./commodity";
import type { SentimentRecord } from "./types";

/**
 * Rangkaian kookurens entiti: dua entiti dihubungkan jika disebut dalam siaran yang sama.
 * Entiti: komoditi, topik, negeri, daerah/bandar dan sumber bukan media sosial.
 */

export type NodeKind = "komoditi" | "topik" | "negeri" | "daerah" | "sumber";

export interface NetNode {
  id: string;
  kind: NodeKind;
  /** Nilai mentah untuk tapisan (slug komoditi, kod topik, nama negeri, ...) */
  value: string;
  label: string;
  count: number;
  positif: number;
  neutral: number;
  negatif: number;
  /** (positif - negatif) / jumlah, -1 hingga 1 */
  score: number;
}

export interface NetLink {
  source: string;
  target: string;
  weight: number;
  /** Skor sentimen bersih siaran yang menghubungkan kedua-dua entiti */
  score: number;
}

export interface Network {
  nodes: NetNode[];
  links: NetLink[];
}

export const EMPTY_NETWORK: Network = { nodes: [], links: [] };

/** Had bilangan nod bagi setiap jenis supaya graf kekal boleh dibaca. */
const LIMITS: Record<NodeKind, number> = { komoditi: 20, topik: 6, negeri: 12, daerah: 14, sumber: 6 };
const MAX_LINKS = 220;
const MIN_LINK_WEIGHT = 2;
/** Laman media sosial yang dikongsi melalui laman web bukan "sumber" berasingan. */
const SOCIAL_SOURCE = /^(?:[a-z0-9-]+\.)*(facebook|fb|instagram|threads|tiktok|twitter|x|youtube|youtu)\.(com|net|be)$|^(facebook|instagram|threads|tiktok|twitter|x|youtube)$/i;

function entitiesOf(r: SentimentRecord): [NodeKind, string][] {
  const out: [NodeKind, string][] = [];
  const commodity = r.commodity ?? (r.keywords[0]?.startsWith("#") ? r.keywords[0].slice(1).toLowerCase() : null);
  if (commodity) out.push(["komoditi", commodity]);
  for (const t of r.topics ?? []) if (t !== "lain") out.push(["topik", t]);
  const states = r.states ?? [];
  for (const s of states) out.push(["negeri", s]);
  // Daerah yang sama nama dengan Wilayah Persekutuan (Kuala Lumpur, Putrajaya, Labuan) sudah diwakili oleh negeri.
  for (const d of r.districts ?? []) if (!states.includes(`WP ${d}`)) out.push(["daerah", d]);
  if (r.source && r.source_type && r.source_type !== "sosial" && !SOCIAL_SOURCE.test(r.source)) {
    out.push(["sumber", r.source]);
  }
  return out;
}

function labelOf(kind: NodeKind, value: string): string {
  if (kind === "komoditi") return commodityLabel(value);
  if (kind === "topik") return optionLabel("topic", value);
  if (kind === "sumber") return value.replace(/\.(com|my|net|org|gov)(\.[a-z]{2})?$/i, "");
  return value;
}

type Tally = { count: number; positif: number; neutral: number; negatif: number };
const newTally = (): Tally => ({ count: 0, positif: 0, neutral: 0, negatif: 0 });
const scoreOf = (t: Tally) => (t.count > 0 ? (t.positif - t.negatif) / t.count : 0);

export function buildNetwork(records: SentimentRecord[]): Network {
  // 1. Kira setiap entiti, pilih yang teratas bagi setiap jenis.
  const tallies = new Map<string, { kind: NodeKind; value: string; t: Tally }>();
  const perRecord: string[][] = [];
  for (const r of records) {
    const ids: string[] = [];
    for (const [kind, value] of entitiesOf(r)) {
      const id = `${kind}:${value}`;
      if (ids.includes(id)) continue;
      ids.push(id);
      let e = tallies.get(id);
      if (!e) {
        e = { kind, value, t: newTally() };
        tallies.set(id, e);
      }
      e.t.count++;
      e.t[r.sentiment]++;
    }
    perRecord.push(ids);
  }

  const keep = new Set<string>();
  for (const kind of Object.keys(LIMITS) as NodeKind[]) {
    [...tallies.entries()]
      .filter(([, e]) => e.kind === kind && e.t.count >= 2)
      .sort((a, b) => b[1].t.count - a[1].t.count)
      .slice(0, LIMITS[kind])
      .forEach(([id]) => keep.add(id));
  }

  // 2. Kira pasangan entiti dalam siaran yang sama.
  const pairs = new Map<string, Tally>();
  records.forEach((r, i) => {
    const ids = perRecord[i].filter((id) => keep.has(id));
    for (let a = 0; a < ids.length; a++) {
      for (let b = a + 1; b < ids.length; b++) {
        const [x, y] = ids[a] < ids[b] ? [ids[a], ids[b]] : [ids[b], ids[a]];
        // Daerah sentiasa muncul bersama negerinya; pautan itu tidak bermaklumat.
        if (x.startsWith("daerah:") && y.startsWith("negeri:")) continue;
        if (y.startsWith("daerah:") && x.startsWith("negeri:")) continue;
        const key = `${x}|${y}`;
        let t = pairs.get(key);
        if (!t) {
          t = newTally();
          pairs.set(key, t);
        }
        t.count++;
        t[r.sentiment]++;
      }
    }
  });

  const links: NetLink[] = [...pairs.entries()]
    .filter(([, t]) => t.count >= MIN_LINK_WEIGHT)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, MAX_LINKS)
    .map(([key, t]) => {
      const [source, target] = key.split("|");
      return { source, target, weight: t.count, score: scoreOf(t) };
    });

  // Buang nod yang tiada sebarang pautan, kecuali komoditi (sentiasa dipaparkan).
  const linked = new Set(links.flatMap((l) => [l.source, l.target]));
  const nodes: NetNode[] = [...keep]
    .filter((id) => linked.has(id) || id.startsWith("komoditi:"))
    .map((id) => {
      const e = tallies.get(id)!;
      return {
        id,
        kind: e.kind,
        value: e.value,
        label: labelOf(e.kind, e.value),
        ...e.t,
        score: scoreOf(e.t),
      };
    });

  return { nodes, links };
}
