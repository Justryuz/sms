"use client";

import { useMemo, useState } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import type { NetLink, NetNode, Network, NodeKind } from "@/lib/network";

const W = 960;
const H = 560;
const PAD = 24;

export const KIND_META: Record<NodeKind, { label: string; stroke: string }> = {
  komoditi: { label: "Komoditi", stroke: "#0F172A" },
  topik: { label: "Topik", stroke: "#0284C7" },
  negeri: { label: "Negeri", stroke: "#D97706" },
  daerah: { label: "Daerah / bandar", stroke: "#F59E0B" },
  sumber: { label: "Sumber", stroke: "#7C3AED" },
};

/** Skor -1 (negatif) .. 0 (neutral) .. 1 (positif) kepada warna merah - kelabu - hijau. */
function scoreColor(score: number): string {
  const lerp = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const red = [239, 68, 68];
  const grey = [148, 163, 184];
  const green = [16, 185, 129];
  // Kuatkan perbezaan: skor bersih kebanyakannya kecil.
  const t = Math.max(-1, Math.min(1, score * 1.8));
  const rgb = t < 0 ? lerp(grey, red, -t) : lerp(grey, green, t);
  return `rgb(${rgb.join(",")})`;
}

type SimNode = NetNode & SimulationNodeDatum & { r: number };
type SimLink = SimulationLinkDatum<SimNode> & NetLink;

interface Layout {
  nodes: SimNode[];
  links: (Omit<SimLink, "source" | "target"> & { source: SimNode; target: SimNode })[];
  maxWeight: number;
}

function computeLayout(net: Network): Layout {
  const maxCount = Math.max(1, ...net.nodes.map((n) => n.count));
  const nodes: SimNode[] = net.nodes.map((n) => ({ ...n, r: 5 + 23 * Math.sqrt(n.count / maxCount) }));
  const ids = new Set(nodes.map((n) => n.id));
  const links: SimLink[] = net.links.filter((l) => ids.has(l.source) && ids.has(l.target)).map((l) => ({ ...l }));
  const maxWeight = Math.max(1, ...links.map((l) => l.weight));

  forceSimulation(nodes)
    .force(
      "link",
      forceLink<SimNode, SimLink>(links)
        .id((d) => d.id)
        .distance((l) => 190 - 100 * Math.sqrt(l.weight / maxWeight))
        .strength((l) => 0.08 + 0.5 * (l.weight / maxWeight)),
    )
    .force("charge", forceManyBody<SimNode>().strength((d) => -220 - d.r * 14))
    // Ruang tambahan di bawah bulatan untuk label.
    .force(
      "collide",
      forceCollide<SimNode>()
        // Ambil kira lebar label (lebih kurang 3.4px setiap aksara di setiap sisi).
        .radius((d) => Math.max(d.r + 14, d.label.length * (d.kind === "komoditi" || d.kind === "topik" ? 3.6 : 2.9)))
        .iterations(3),
    )
    .force("center", forceCenter(W / 2, H / 2))
    .force("x", forceX(W / 2).strength(0.02))
    .force("y", forceY(H / 2).strength(0.035))
    .stop()
    .tick(400);

  // Regangkan susun atur supaya memenuhi kotak paparan. Guna persentil 4-96 supaya
  // beberapa nod terpencil tidak mengecilkan bahagian tengah; nod terpencil dihimpit ke tepi.
  const pct = (arr: number[], p: number) => {
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))];
  };
  const xs = nodes.map((n) => n.x ?? W / 2);
  const ys = nodes.map((n) => n.y ?? H / 2);
  const [minX, maxX, minY, maxY] = [pct(xs, 0.04), pct(xs, 0.96), pct(ys, 0.04), pct(ys, 0.96)];
  const sx = (W - 2 * PAD - 60) / Math.max(1, maxX - minX);
  const sy = (H - 2 * PAD - 40) / Math.max(1, maxY - minY);
  for (const n of nodes) {
    const x = PAD + 30 + ((n.x ?? 0) - minX) * sx;
    const y = PAD + 14 + ((n.y ?? 0) - minY) * sy;
    n.x = Math.max(PAD + n.r, Math.min(W - PAD - n.r, x));
    n.y = Math.max(PAD + n.r, Math.min(H - PAD - n.r - 12, y));
  }
  return { nodes, links: links as Layout["links"], maxWeight };
}

interface KeywordNetworkProps {
  network: Network;
  isActive: (node: NetNode) => boolean;
  onSelect: (node: NetNode) => void;
}

export function KeywordNetwork({ network, isActive, onSelect }: KeywordNetworkProps) {
  const layout = useMemo(() => computeLayout(network), [network]);
  const [hover, setHover] = useState<string | null>(null);

  const neighbours = useMemo(() => {
    if (!hover) return null;
    const set = new Set([hover]);
    for (const l of layout.links) {
      if (l.source.id === hover) set.add(l.target.id);
      if (l.target.id === hover) set.add(l.source.id);
    }
    return set;
  }, [hover, layout]);

  const hovered = hover ? layout.nodes.find((n) => n.id === hover) : null;

  if (layout.nodes.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-500">Tiada data rangkaian untuk tapisan semasa.</p>;
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full select-none"
        role="img"
        aria-label="Graf rangkaian topik dan kata kunci"
        onMouseLeave={() => setHover(null)}
      >
        <g>
          {layout.links.map((l) => {
            const dim = neighbours && !(neighbours.has(l.source.id) && neighbours.has(l.target.id));
            const t = l.weight / layout.maxWeight;
            return (
              <line
                key={`${l.source.id}|${l.target.id}`}
                x1={l.source.x}
                y1={l.source.y}
                x2={l.target.x}
                y2={l.target.y}
                stroke={scoreColor(l.score)}
                strokeWidth={0.6 + 5 * t}
                strokeOpacity={dim ? 0.04 : neighbours ? 0.8 : 0.22 + 0.5 * t}
              />
            );
          })}
        </g>
        <g>
          {layout.nodes.map((n) => {
            const dim = neighbours && !neighbours.has(n.id);
            const active = isActive(n);
            const major = n.kind === "komoditi" || n.kind === "topik";
            return (
              <g
                key={n.id}
                transform={`translate(${n.x},${n.y})`}
                className="cursor-pointer"
                opacity={dim ? 0.2 : 1}
                onMouseEnter={() => setHover(n.id)}
                onClick={() => onSelect(n)}
              >
                {active && <circle r={n.r + 5} fill="none" stroke="#4F46E5" strokeWidth={3} />}
                <circle
                  r={n.r}
                  fill={scoreColor(n.score)}
                  stroke={KIND_META[n.kind].stroke}
                  strokeWidth={n.kind === "komoditi" ? 1.8 : 1.2}
                  strokeDasharray={n.kind === "topik" ? "3 2" : undefined}
                />
                {(
                  <text
                    y={n.r + 12}
                    textAnchor="middle"
                    fontSize={major ? 12.5 : 10.5}
                    fontWeight={major ? 600 : 400}
                    fill={major ? "#0F172A" : "#475569"}
                    stroke="#fff"
                    strokeWidth={3}
                    paintOrder="stroke"
                    pointerEvents="none"
                  >
                    {n.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {hovered && (
        <div className="pointer-events-none absolute left-3 top-3 max-w-[240px] rounded-lg border border-slate-200 bg-white/95 p-3 text-xs shadow-lg">
          <p className="font-semibold text-slate-900">{hovered.label}</p>
          <p className="text-slate-500">
            {KIND_META[hovered.kind].label} · {hovered.count.toLocaleString("en-US")} siaran
          </p>
          <div className="mt-1.5 flex gap-3">
            <span className="text-emerald-600">{Math.round((hovered.positif / hovered.count) * 100)}% positif</span>
            <span className="text-red-600">{Math.round((hovered.negatif / hovered.count) * 100)}% negatif</span>
          </div>
          <p className="mt-1.5 text-slate-500">
            Paling kerap bersama:{" "}
            {layout.links
              .filter((l) => l.source.id === hovered.id || l.target.id === hovered.id)
              .sort((a, b) => b.weight - a.weight)
              .slice(0, 3)
              .map((l) => (l.source.id === hovered.id ? l.target.label : l.source.label))
              .join(", ") || "-"}
          </p>
          <p className="mt-1 text-slate-400">Klik untuk menapis</p>
        </div>
      )}
    </div>
  );
}

export function NetworkLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-12 rounded-full" style={{ background: "linear-gradient(90deg,#EF4444,#94A3B8,#10B981)" }} />
        Negatif → Positif
      </span>
      {(Object.keys(KIND_META) as NodeKind[]).map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <svg width="14" height="14" aria-hidden>
            <circle
              cx="7"
              cy="7"
              r="5.5"
              fill="#E2E8F0"
              stroke={KIND_META[k].stroke}
              strokeWidth="1.6"
              strokeDasharray={k === "topik" ? "3 2" : undefined}
            />
          </svg>
          {KIND_META[k].label}
        </span>
      ))}
      <span className="text-slate-400">Saiz = bilangan siaran · Garisan = disebut bersama</span>
    </div>
  );
}
