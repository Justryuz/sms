"use client";

import { useState } from "react";
import { List, Share2 } from "lucide-react";
import type { KeywordStat } from "@/lib/analytics";
import type { NetNode, Network } from "@/lib/network";
import { Card } from "./Card";
import { KeywordNetwork, NetworkLegend } from "./KeywordNetwork";

interface TrendingKeywordsProps {
  keywords: KeywordStat[];
  network: Network;
  selected: string | null;
  onSelect: (tag: string | null) => void;
  /** Nod graf yang sedang ditapis */
  isNodeActive: (node: NetNode) => boolean;
  onNodeSelect: (node: NetNode) => void;
  loading: boolean;
}

const TONE = {
  positif: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  negatif: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  neutral: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
};

export function TrendingKeywords({
  keywords,
  network,
  selected,
  onSelect,
  isNodeActive,
  onNodeSelect,
  loading,
}: TrendingKeywordsProps) {
  const [view, setView] = useState<"graf" | "senarai">("graf");
  const max = Math.max(1, ...keywords.map((k) => k.count));

  const toggle = (
    <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
      {(
        [
          ["graf", "Rangkaian", Share2],
          ["senarai", "Senarai tag", List],
        ] as const
      ).map(([key, label, Icon]) => (
        <button
          key={key}
          onClick={() => setView(key)}
          aria-pressed={view === key}
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
            view === key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <Card title="Topik Hangat & Kata Kunci" action={toggle} className="h-full">
      {loading ? (
        <div className="h-80 animate-pulse rounded-lg bg-slate-100" />
      ) : view === "graf" ? (
        <>
          <KeywordNetwork network={network} isActive={isNodeActive} onSelect={onNodeSelect} />
          <div className="mt-3 border-t border-slate-100 pt-3">
            <NetworkLegend />
            <p className="mt-2 text-xs text-slate-500">
              Halakan tetikus pada bulatan untuk melihat hubungannya. Klik untuk menapis dashboard (klik sekali lagi
              untuk buang tapisan).
            </p>
          </div>
        </>
      ) : keywords.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">Tiada kata kunci untuk tempoh ini.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {keywords.map((k) => {
              const active = selected?.toLowerCase() === k.tag.toLowerCase();
              const size = k.count / max > 0.66 ? "text-base" : k.count / max > 0.33 ? "text-sm" : "text-xs";
              return (
                <button
                  key={k.tag}
                  onClick={() => onSelect(active ? null : k.tag)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-200 ${size} ${
                    active ? "border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700" : TONE[k.sentiment]
                  }`}
                >
                  {k.tag}
                  <span className={`text-xs ${active ? "text-indigo-100" : "opacity-60"}`}>{k.count}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Klik topik untuk menapis suapan langsung. Warna menunjukkan sentimen dominan.
          </p>
        </>
      )}
    </Card>
  );
}
