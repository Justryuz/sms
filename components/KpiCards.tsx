import { Activity, MessageSquare, ShieldAlert, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { formatCompact, formatNumber, type Kpis } from "@/lib/analytics";
import { CRISIS_THRESHOLD, platformMeta } from "@/lib/constants";

interface KpiCardsProps {
  kpis: Kpis;
  /** Komoditi band Merah / Kuning daripada db-curated */
  riskRed: string[];
  riskWatch: string[];
  loading: boolean;
}

function Shell({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {icon}
      </div>
      {children}
    </div>
  );
}

const iconBox = (cls: string) => `flex h-9 w-9 items-center justify-center rounded-lg ${cls}`;

export function KpiCards({ kpis, riskRed, riskWatch, loading }: KpiCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[132px] animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />
        ))}
      </div>
    );
  }

  const change = kpis.totalChange;
  const up = change !== null && change >= 0;
  const positif = Math.round(kpis.positifPct);
  const negatif = Math.round(kpis.negatifPct);
  const crisis = kpis.crisis || riskRed.length > 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Shell label="Jumlah Sebutan" icon={<div className={iconBox("bg-indigo-50 text-indigo-600")}><MessageSquare className="h-5 w-5" /></div>}>
        <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{formatNumber(kpis.total)}</p>
        <div className="mt-2 flex items-center gap-2">
          {change !== null ? (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                up ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              }`}
            >
              {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {up ? "+" : ""}
              {change.toFixed(1)}%
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">-</span>
          )}
          <span className="text-xs text-slate-500">berbanding tempoh lepas</span>
        </div>
      </Shell>

      <Shell label="Skor Sentimen" icon={<div className={iconBox("bg-emerald-50 text-emerald-600")}><TrendingUp className="h-5 w-5" /></div>}>
        <p
          className={`mt-3 text-3xl font-bold tracking-tight ${
            positif >= 50 ? "text-emerald-600" : "text-amber-600"
          }`}
        >
          {kpis.total === 0 ? "-" : `+${positif}% Positif ${kpis.positifTrendUp ? "↑" : "↓"}`}
        </p>
        <p className="mt-2 text-xs text-slate-500">Peratus sebutan positif berbanding tempoh lepas</p>
      </Shell>

      <Shell label="Kadar Penglibatan" icon={<div className={iconBox("bg-pink-50 text-pink-600")}><Activity className="h-5 w-5" /></div>}>
        <div className="mt-3 flex items-baseline gap-2">
          <p className="text-3xl font-bold tracking-tight text-slate-900">{formatCompact(kpis.engagement)}</p>
          {kpis.engagementChange !== null && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                kpis.engagementChange >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              }`}
            >
              {kpis.engagementChange >= 0 ? "+" : ""}
              {kpis.engagementChange.toFixed(1)}%
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          <span className="font-medium text-slate-700">{formatNumber(kpis.likes)}</span> suka ·{" "}
          <span className="font-medium text-slate-700">{formatNumber(kpis.comments)}</span> komen
          {kpis.shares > 0 && (
            <>
              {" "}
              · <span className="font-medium text-slate-700">{formatNumber(kpis.shares)}</span> kongsi
            </>
          )}
        </p>
        {kpis.engagementByPlatform.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
            {kpis.engagementByPlatform.slice(0, 4).map((p) => (
              <span key={p.platform} title={`${formatNumber(p.engagement)} interaksi daripada ${formatNumber(p.posts)} siaran (purata ${p.avg.toFixed(1)} setiap siaran)`}>
                {platformMeta(p.platform).label} <span className="font-medium text-slate-700">{formatCompact(p.engagement)}</span>
              </span>
            ))}
          </div>
        )}
      </Shell>

      <div
        className={`rounded-xl border p-5 shadow-sm ${
          crisis ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-500">Alert Krisis</p>
          <div className={iconBox(crisis ? "bg-red-100 text-red-600" : "bg-sky-50 text-sky-600")}>
            {crisis ? <ShieldAlert className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          {crisis ? (
            <>
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
              </span>
              <p className="text-2xl font-bold tracking-tight text-red-600">Amaran Lonjakan</p>
            </>
          ) : (
            <>
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              <p className="text-2xl font-bold tracking-tight text-sky-700">Normal</p>
            </>
          )}
        </div>
        <p className={`mt-2 text-xs ${kpis.crisis ? "text-red-700" : "text-slate-500"}`}>
          Sentimen negatif {negatif}% (had amaran {CRISIS_THRESHOLD}%)
        </p>
        {riskRed.length > 0 && (
          <p className="mt-1 text-xs font-medium text-red-700">Band Merah: {riskRed.join(", ")}</p>
        )}
        {riskWatch.length > 0 && (
          <p className="mt-1 text-xs text-amber-700">Dipantau (Kuning): {riskWatch.join(", ")}</p>
        )}
      </div>
    </div>
  );
}
