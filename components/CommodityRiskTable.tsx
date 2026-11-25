"use client";

import { Fragment, useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, ChevronDown } from "lucide-react";
import type { RiskSummary, RiskView } from "@/lib/analytics";
import { BAND_META } from "@/lib/commodity";
import { Card } from "./Card";

interface CommodityRiskTableProps {
  summary: RiskSummary;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  loading: boolean;
}

function RiskChange({ before, current }: { before: number | null; current: number | null }) {
  if (current === null) return <span className="text-slate-400">-</span>;
  const diff = before === null ? 0 : current - before;
  const Icon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : ArrowRight;
  const tone = diff > 0 ? "text-red-600" : diff < 0 ? "text-emerald-600" : "text-slate-500";
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-xs text-slate-400">{before ?? "-"}</span>
      <Icon className={`h-3.5 w-3.5 ${tone}`} />
      <span className="text-base font-semibold text-slate-900">{current}</span>
    </span>
  );
}

function formatPrice(r: RiskView): string {
  if (r.price_value === null) return "-";
  const unit = r.price_unit.replace(/^RM\s*\/?\s*/i, "");
  return `RM${r.price_value.toFixed(2)}${unit ? `/${unit}` : ""}`;
}

export function CommodityRiskTable({ summary, selectedTag, onSelectTag, loading }: CommodityRiskTableProps) {
  const [open, setOpen] = useState<string | null>(null);

  const action = summary.asOf ? (
    <span className="text-xs text-slate-500">
      Setakat <span className="font-mono font-medium text-slate-700">{summary.asOf}</span> · sumber: db-curated
    </span>
  ) : null;

  return (
    <Card title="Risiko Komoditi" action={action}>
      {loading ? (
        <div className="h-64 animate-pulse rounded-lg bg-slate-100" />
      ) : summary.rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">
          Tiada data risiko komoditi untuk tempoh ini. Tekan &quot;Sync Google Drive&quot; untuk menarik fail db-curated.
        </p>
      ) : (
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-4 font-medium">Komoditi</th>
                <th className="pb-2 pr-4 font-medium">Band</th>
                <th className="pb-2 pr-4 font-medium">Risiko (sebelum → semasa)</th>
                <th className="pb-2 pr-4 font-medium">Ramalan</th>
                <th className="pb-2 pr-4 font-medium">Indeks Sentimen</th>
                <th className="pb-2 pr-4 font-medium">Harga</th>
                <th className="pb-2 font-medium">Nota Analis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.rows.map((r) => {
                const tag = `#${r.commodity}`;
                const active = selectedTag?.toLowerCase() === tag;
                const expanded = open === r.key;
                const band = BAND_META[r.bandKey];
                return (
                  <Fragment key={r.key}>
                    <tr className={`align-top ${active ? "bg-indigo-50/60" : "hover:bg-slate-50"}`}>
                      <td className="py-3 pr-4">
                        <button
                          onClick={() => onSelectTag(active ? null : tag)}
                          title="Tapis suapan langsung mengikut komoditi ini"
                          className="text-left font-medium text-slate-900 hover:text-indigo-600"
                        >
                          {r.label}
                        </button>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                          {r.sample_n !== null && <span>n={r.sample_n}</span>}
                          {r.preliminary && (
                            <span className="rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">Awal</span>
                          )}
                          {summary.asOf && r.date !== summary.asOf && (
                            <span className="font-mono">{r.date}</span>
                          )}
                        </div>
                        {r.insufficientLatest && (
                          <div
                            className="mt-1 text-[11px] leading-tight text-slate-500"
                            title={`Penilaian ${r.insufficientLatest.date} ditanda "tiada data" oleh analis kerana sampel terlalu kecil. Baris ini memaparkan penilaian sah terakhir (${r.date}).`}
                          >
                            {r.insufficientLatest.date}: data tidak mencukupi
                            {r.insufficientLatest.sample_n !== null ? ` (n=${r.insufficientLatest.sample_n})` : ""}
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${band.pill}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${band.dot}`} />
                          {band.label}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <RiskChange before={r.risk_before} current={r.risk_current} />
                      </td>
                      <td className="py-3 pr-4 font-medium text-slate-700">{r.risk_forward ?? "-"}</td>
                      <td className="py-3 pr-4">
                        {r.sentiment_index === null ? (
                          <span className="text-slate-400">-</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${
                                  r.sentiment_index >= 60
                                    ? "bg-emerald-500"
                                    : r.sentiment_index >= 40
                                      ? "bg-slate-400"
                                      : "bg-red-500"
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, r.sentiment_index))}%` }}
                              />
                            </div>
                            <span className="font-medium text-slate-700">{Math.round(r.sentiment_index)}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="whitespace-nowrap font-medium text-slate-900">{formatPrice(r)}</div>
                        {r.price_label && (
                          <div className="max-w-[180px] truncate text-xs text-slate-500" title={r.price_label}>
                            {r.price_label}
                          </div>
                        )}
                      </td>
                      <td className="max-w-[320px] py-3">
                        {r.analyst_note ? (
                          <button
                            onClick={() => setOpen(expanded ? null : r.key)}
                            aria-expanded={expanded}
                            className="flex w-full items-start gap-1 text-left text-slate-600 hover:text-slate-900"
                          >
                            <span className={expanded ? "" : "line-clamp-2"}>{r.analyst_note}</span>
                            <ChevronDown
                              className={`mt-0.5 h-4 w-4 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
                            />
                          </button>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
