"use client";

import { useCallback, useDeferredValue, useState } from "react";
import type { NetNode } from "@/lib/network";
import { rangeKey } from "@/lib/period";
import { AlertCircle } from "lucide-react";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { CategoryFilters } from "@/components/CategoryFilters";
import { CommodityRiskTable } from "@/components/CommodityRiskTable";
import { FilterBar } from "@/components/FilterBar";
import { ImportDataModal } from "@/components/ImportDataModal";
import { KpiCards } from "@/components/KpiCards";
import { LiveFeedTable } from "@/components/LiveFeedTable";
import { Navbar } from "@/components/Navbar";
import { SentimentDonutChart } from "@/components/SentimentDonutChart";
import { SentimentTrendChart } from "@/components/SentimentTrendChart";
import { ToastProvider, useToast } from "@/components/Toast";
import { TrendingKeywords } from "@/components/TrendingKeywords";
import { useSentimentData } from "@/hooks/useSentimentData";
import { classifyAi, syncGoogleDrive } from "@/lib/api";
import {
  NO_CATEGORY_FILTERS,
  type CategoryFilters as Cats,
  type DateRange,
  type DimKey,
  type PlatformFilter,
} from "@/lib/types";

function Dashboard() {
  const toast = useToast();
  const [range, setRange] = useState<DateRange>({ mode: "7d" });
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [cats, setCats] = useState<Cats>(NO_CATEGORY_FILTERS);
  const setCat = useCallback((key: DimKey, value: string) => setCats((c) => ({ ...c, [key]: value })), []);
  const [importOpen, setImportOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [classifying, setClassifying] = useState(false);

  const deferredSearch = useDeferredValue(search);
  const data = useSentimentData({ range, platform, search: deferredSearch, tag, cats });
  const { refresh } = data;

  /** Panggil /api/classify berulang kali sehingga tiada rekod menunggu (atau tiada kemajuan). */
  const classifyAll = useCallback(async (): Promise<{ done: number; remaining: number; error?: string }> => {
    let done = 0;
    let remaining = 0;
    for (let i = 0; i < 40; i++) {
      const r = await classifyAi(500);
      if (!r.enabled) return { done, remaining: 0 };
      done += r.classified;
      remaining = r.remaining;
      if (r.remaining === 0) return { done, remaining };
      if (r.classified === 0) return { done, remaining, error: r.errors[0] ?? "Tiada kemajuan." };
    }
    return { done, remaining };
  }, []);

  const handleClassify = useCallback(async () => {
    setClassifying(true);
    try {
      const r = await classifyAll();
      if (r.error) toast("error", `${r.done} siaran dikelas AI, ${r.remaining} masih menunggu. Ralat: ${r.error}`);
      else toast("success", `${r.done.toLocaleString("en-US")} siaran dikelas semula oleh AI.`);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Pengelasan AI gagal.");
    } finally {
      await refresh();
      setClassifying(false);
    }
  }, [classifyAll, refresh, toast]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const r = await syncGoogleDrive();
      const detail = `${r.filesProcessed} fail, ${r.foldersScanned} folder diimbas`;
      const ai =
        r.ai?.enabled && r.ai.classified > 0
          ? ` ${r.ai.classified} dikelas AI${r.ai.remaining > 0 ? `, ${r.ai.remaining} menunggu` : ""}.`
          : "";
      if (r.errors.length > 0) {
        toast("error", `${r.newRecords} rekod baharu disegerakkan (${detail}). Ralat: ${r.errors[0]}`);
      } else if (r.newRecords === 0) {
        toast("success", `Tiada rekod baharu. Semua data sudah dikemas kini (${detail}).${ai}`);
      } else {
        toast(
          "success",
          `${r.newRecords.toLocaleString("en-US")} rekod baharu disegerakkan (${detail}).` +
            ai +
            (r.partial ? " Tekan sekali lagi untuk fail yang tinggal." : ""),
        );
      }
      if (r.ai && !r.ai.ok) toast("error", r.ai.error ?? "Pengelasan AI gagal.");
      await refresh();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Segerak Google Drive gagal.");
    } finally {
      setSyncing(false);
    }
  }, [toast, refresh]);
  const handleImported = useCallback(() => void refresh(), [refresh]);

  /** Klik nod graf: komoditi -> tag, topik/negeri -> penapis kategori, daerah/sumber -> carian. */
  const isNodeActive = useCallback(
    (n: NetNode) => {
      if (n.kind === "komoditi") return tag?.toLowerCase() === `#${n.value}`;
      if (n.kind === "topik") return cats.topic === n.value;
      if (n.kind === "negeri") return cats.state === n.value;
      return search.trim().toLowerCase() === n.value.toLowerCase();
    },
    [tag, cats.topic, cats.state, search],
  );

  const handleNodeSelect = useCallback(
    (n: NetNode) => {
      const active = isNodeActive(n);
      if (n.kind === "komoditi") setTag(active ? null : `#${n.value}`);
      else if (n.kind === "topik") setCat("topic", active ? "all" : n.value);
      else if (n.kind === "negeri") setCat("state", active ? "all" : n.value);
      else setSearch(active ? "" : n.value);
    },
    [isNodeActive, setCat],
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar
        search={search}
        onSearchChange={setSearch}
        onImportClick={() => setImportOpen(true)}
        onSyncClick={handleSync}
        syncing={syncing}
      />

      <main className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 sm:px-6">
        <FilterBar
          range={range}
          platform={platform}
          onRangeChange={(v) => {
            setRange(v);
            setTag(null);
          }}
          onPlatformChange={(v) => {
            setPlatform(v);
            setTag(null);
          }}
          storage={data.storage}
          today={data.today}
          minDate={data.minDate}
          realtime={data.realtime}
          aiModel={data.aiModel}
          aiPending={data.aiPending}
          classifying={classifying}
          onClassify={handleClassify}
        />

        <CategoryFilters value={cats} onChange={setCat} onReset={() => setCats(NO_CATEGORY_FILTERS)} />

        {data.error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Gagal memuatkan data: {data.error}</p>
          </div>
        )}

        {data.empty && !data.error && (
          <div className="flex flex-col gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900 sm:flex-row sm:items-center sm:justify-between">
            <p>Belum ada data. Tekan butang ini untuk menarik semua folder harian daripada Google Drive.</p>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="h-9 shrink-0 rounded-lg bg-indigo-600 px-4 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {syncing ? "Menyegerak..." : "Sync Google Drive sekarang"}
            </button>
          </div>
        )}

        <KpiCards kpis={data.kpis} riskRed={data.risk.red} riskWatch={data.risk.watch} loading={data.loading} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[65fr_35fr]">
          <SentimentTrendChart data={data.trend} loading={data.loading} />
          <SentimentDonutChart data={data.breakdown} loading={data.loading} />
        </div>

        <CategoryBreakdown
          categories={data.categories}
          districts={data.districts}
          filters={cats}
          onSelect={setCat}
          loading={data.loading}
        />

        <CommodityRiskTable summary={data.risk} selectedTag={tag} onSelectTag={setTag} loading={data.loading} />

        <TrendingKeywords
          keywords={data.keywords}
          network={data.network}
          selected={tag}
          onSelect={setTag}
          isNodeActive={isNodeActive}
          onNodeSelect={handleNodeSelect}
          loading={data.loading}
        />

        <LiveFeedTable
          key={`${rangeKey(range)}|${platform}|${deferredSearch}|${tag}|${Object.values(cats).join(",")}`}
          rows={data.feed}
          tag={tag}
          onClearTag={() => setTag(null)}
          loading={data.loading}
          live={data.realtime}
        />
      </main>

      <ImportDataModal open={importOpen} onClose={() => setImportOpen(false)} onImported={handleImported} />
    </div>
  );
}

export default function Page() {
  return (
    <ToastProvider>
      <Dashboard />
    </ToastProvider>
  );
}
