"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CategoryBreakdown as Breakdown, CategoryStat, DistrictStat } from "@/lib/analytics";
import { DIMENSIONS, DIM_BY_KEY, UNKNOWN } from "@/lib/categories";
import { SENTIMENT_META } from "@/lib/constants";
import type { CategoryFilters, DimKey } from "@/lib/types";
import { Card } from "./Card";

interface CategoryBreakdownProps {
  categories: Record<DimKey, Breakdown>;
  districts: DistrictStat[];
  filters: CategoryFilters;
  onSelect: (key: DimKey, value: string) => void;
  loading: boolean;
}

interface TipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: CategoryStat }>;
}

function StatTooltip({ active, payload }: TipProps) {
  const s = payload?.[0]?.payload;
  if (!active || !s) return null;
  const pct = (n: number) => `${Math.round((n / Math.max(1, s.total)) * 100)}%`;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-slate-900">
        {s.label} · {s.total.toLocaleString("en-US")} siaran
      </p>
      {(["positif", "neutral", "negatif"] as const).map((k) => (
        <div key={k} className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SENTIMENT_META[k].color }} />
            {SENTIMENT_META[k].label}
          </span>
          <span className="font-medium text-slate-900">
            {s[k]} ({pct(s[k])})
          </span>
        </div>
      ))}
      <p className="mt-1.5 text-slate-400">Klik untuk menapis</p>
    </div>
  );
}

export function CategoryBreakdown({ categories, districts, filters, onSelect, loading }: CategoryBreakdownProps) {
  const [tab, setTab] = useState<DimKey>("topic");
  const [showUnknown, setShowUnknown] = useState(false);

  const dim = DIM_BY_KEY[tab];
  const data = categories[tab];
  const hasUnknown = data.stats.some((s) => s.value === UNKNOWN);
  const stats = showUnknown ? data.stats : data.stats.filter((s) => s.value !== UNKNOWN);
  const selected = filters[tab];
  const coverage = data.total > 0 ? Math.round((data.known / data.total) * 100) : 0;
  const height = Math.max(200, stats.length * 34 + 60);

  const tabs = (
    <div className="-mb-1 flex flex-wrap gap-1">
      {DIMENSIONS.map((d) => (
        <button
          key={d.key}
          onClick={() => setTab(d.key)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium ${
            tab === d.key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {d.label}
          {filters[d.key] !== "all" && <span className="ml-1 text-indigo-400">●</span>}
        </button>
      ))}
    </div>
  );

  return (
    <Card title="Pecahan Mengikut Kategori" action={tabs}>
      {loading ? (
        <div className="h-64 animate-pulse rounded-lg bg-slate-100" />
      ) : data.total === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">Tiada data untuk tapisan semasa.</p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              {dim.note ? `${dim.note} ` : ""}
              {hasUnknown && (
                <>
                  Liputan: <span className="font-semibold text-slate-700">{coverage}%</span> daripada{" "}
                  {data.total.toLocaleString("en-US")} siaran.
                </>
              )}
            </span>
            {hasUnknown && (
              <label className="inline-flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={showUnknown}
                  onChange={(e) => setShowUnknown(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300"
                />
                Papar &quot;tidak diketahui&quot;
              </label>
            )}
          </div>

          {stats.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">Tiada siaran dengan kategori diketahui.</p>
          ) : (
            <div style={{ height }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#64748B" }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={150}
                    tick={{ fontSize: 12, fill: "#334155" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<StatTooltip />} cursor={{ fill: "#F1F5F9" }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  {(["positif", "neutral", "negatif"] as const).map((k, i, arr) => (
                    <Bar
                      key={k}
                      dataKey={k}
                      name={SENTIMENT_META[k].label}
                      stackId="s"
                      fill={SENTIMENT_META[k].color}
                      radius={i === arr.length - 1 ? [0, 4, 4, 0] : 0}
                      cursor="pointer"
                      onClick={(entry: { payload?: CategoryStat }) => {
                        const v = entry.payload?.value;
                        if (v) onSelect(tab, selected === v ? "all" : v);
                      }}
                      fillOpacity={1}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {selected !== "all" && (
            <p className="mt-2 text-xs text-indigo-700">
              Ditapis: <span className="font-semibold">{dim.options.find((o) => o.value === selected)?.label}</span>.
              Klik bar yang sama untuk buang tapisan.
            </p>
          )}

          {tab === "state" && districts.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <MapPin className="h-3.5 w-3.5" />
                Daerah / bandar paling kerap disebut
              </p>
              <div className="flex flex-wrap gap-2">
                {districts.map((d) => (
                  <span
                    key={d.name}
                    title={`${d.negatif} negatif`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
                  >
                    {d.name}
                    <span className="text-slate-400">{d.count}</span>
                    {d.negatif > 0 && <span className="text-red-500">{d.negatif}−</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
