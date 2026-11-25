"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatNumber, type BreakdownItem } from "@/lib/analytics";
import { SENTIMENT_META } from "@/lib/constants";
import { Card } from "./Card";

export function SentimentDonutChart({ data, loading }: { data: BreakdownItem[]; loading: boolean }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const chartData = data.map((d) => ({ ...d, name: SENTIMENT_META[d.key].label }));

  return (
    <Card title="Pecahan Sentimen Keseluruhan" className="h-full">
      {loading ? (
        <div className="h-72 animate-pulse rounded-lg bg-slate-100 sm:h-80" />
      ) : total === 0 ? (
        <div className="flex h-72 items-center justify-center text-sm text-slate-500 sm:h-80">
          Tiada data untuk tempoh ini.
        </div>
      ) : (
        <div className="flex h-72 flex-col items-center gap-4 sm:h-80 sm:flex-row">
          <div className="relative h-44 w-44 shrink-0 sm:h-full sm:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="90%"
                  paddingAngle={2}
                  stroke="none"
                >
                  {chartData.map((d) => (
                    <Cell key={d.key} fill={SENTIMENT_META[d.key].color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-slate-900">{formatNumber(total)}</span>
              <span className="text-xs text-slate-500">sebutan</span>
            </div>
          </div>

          <ul className="w-full flex-1 space-y-3">
            {chartData.map((d) => (
              <li key={d.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 text-slate-700">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: SENTIMENT_META[d.key].color }} />
                  {d.name}
                </span>
                <span className="text-right">
                  <span className="font-semibold text-slate-900">{d.percent}%</span>
                  <span className="ml-2 text-xs text-slate-500">{formatNumber(d.value)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
