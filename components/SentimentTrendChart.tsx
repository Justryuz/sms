"use client";

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TrendPoint } from "@/lib/analytics";
import { SENTIMENT_META } from "@/lib/constants";
import { Card } from "./Card";

interface TipProps {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<{ name?: string | number; value?: number | string; color?: string }>;
}

function TrendTooltip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-slate-900">{label}</p>
      {payload.map((p) => (
        <div key={String(p.name)} className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className="font-medium text-slate-900">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function SentimentTrendChart({ data, loading }: { data: TrendPoint[]; loading: boolean }) {
  const showDots = data.length <= 3;
  const series = [
    { key: "positif", ...SENTIMENT_META.positif },
    { key: "neutral", ...SENTIMENT_META.neutral },
    { key: "negatif", ...SENTIMENT_META.negatif },
  ] as const;

  return (
    <Card title="Trend Sentimen Mengikut Masa" className="h-full">
      <div className="h-72 w-full sm:h-80">
        {loading ? (
          <div className="h-full animate-pulse rounded-lg bg-slate-100" />
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Tiada data untuk tempoh ini.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                {series.map((s) => (
                  <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#64748B" }}
                tickFormatter={(v: string) => v.slice(5)}
                minTickGap={24}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 11, fill: "#64748B" }} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip content={<TrendTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              {series.map((s) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2}
                  fill={`url(#fill-${s.key})`}
                  dot={showDots}
                  activeDot={{ r: 4 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
