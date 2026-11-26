"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildDashboard,
  buildRiskSummary,
  EMPTY_DASHBOARD,
  EMPTY_RISK,
  toYmd,
  type Dashboard,
} from "@/lib/analytics";
import { TABLE } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import type { CommodityRisk, Filters, SentimentRecord } from "@/lib/types";

export type Storage = "supabase" | "local";

interface Loaded {
  records: SentimentRecord[];
  risks: CommodityRisk[];
  storage: Storage;
  aiModel: string | null;
}

function merge(prev: SentimentRecord[], incoming: SentimentRecord[]): SentimentRecord[] {
  const map = new Map(prev.map((r) => [r.external_id, r]));
  for (const r of incoming) map.set(r.external_id, r);
  return [...map.values()];
}

/** Rekod dimuatkan melalui /api/records (Supabase atau storan tempatan di server). */
async function loadRecords(): Promise<Loaded | Error> {
  try {
    const res = await fetch("/api/records", { cache: "no-store" });
    if (res.status === 401) {
      // Muat semula penuh: buang semua keadaan klien selepas sesi tamat.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login";
      return new Error("Sesi tamat. Sila log masuk semula.");
    }
    const data = (await res.json()) as
      | { ok: true; storage: Storage; records: SentimentRecord[]; risks: CommodityRisk[]; aiModel?: string | null }
      | { ok: false; error: string };
    if (!data.ok) return new Error(data.error);
    return { records: data.records, risks: data.risks ?? [], storage: data.storage, aiModel: data.aiModel ?? null };
  } catch (e) {
    return e instanceof Error ? e : new Error("Gagal memuatkan data.");
  }
}

/**
 * "Hari ini" mengikut tarikh crawl terkini jika crawl hari ini belum masuk,
 * supaya julat tarikh tidak kosong sebelum folder harian dimuat naik.
 */
function anchorDate(records: SentimentRecord[]): string {
  const now = toYmd(new Date());
  let latest = "";
  for (const r of records) if (r.crawl_date > latest) latest = r.crawl_date;
  return latest && latest < now ? latest : now;
}

export function useSentimentData(filters: Filters) {
  const [records, setRecords] = useState<SentimentRecord[]>([]);
  const [risks, setRisks] = useState<CommodityRisk[]>([]);
  const [aiModel, setAiModel] = useState<string | null>(null);
  const [storage, setStorage] = useState<Storage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtime, setRealtime] = useState(false);

  const apply = useCallback((res: Loaded | Error) => {
    if (res instanceof Error) setError(res.message);
    else {
      setRecords(res.records);
      setRisks(res.risks);
      setAiModel(res.aiModel);
      setStorage(res.storage);
      setError(null);
    }
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    apply(await loadRecords());
  }, [apply]);

  useEffect(() => {
    let cancelled = false;
    void loadRecords().then((res) => {
      if (!cancelled) apply(res);
    });
    return () => {
      cancelled = true;
    };
  }, [apply]);

  // Supabase Realtime: rekod INSERT baharu dikumpul dan dipaparkan secara berkelompok.
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let buffer: SentimentRecord[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      timer = null;
      const batch = buffer;
      buffer = [];
      setRecords((prev) => merge(prev, batch));
    };

    const channel = client
      .channel("sentiment-inserts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: TABLE }, (payload) => {
        buffer.push(payload.new as SentimentRecord);
        if (!timer) timer = setTimeout(flush, 500);
      })
      .subscribe((status) => setRealtime(status === "SUBSCRIBED"));

    return () => {
      if (timer) clearTimeout(timer);
      void client.removeChannel(channel);
    };
  }, []);

  const { range, platform, search, tag, cats } = filters;
  const today = useMemo(() => (loading ? null : anchorDate(records)), [loading, records]);
  const minDate = useMemo(() => {
    let min: string | null = null;
    for (const r of records) if (!min || r.crawl_date < min) min = r.crawl_date;
    return min;
  }, [records]);
  const dashboard: Dashboard = useMemo(
    () => (today ? buildDashboard(records, { range, platform, search, tag, cats }, today) : EMPTY_DASHBOARD),
    [records, today, range, platform, search, tag, cats],
  );

  const risk = useMemo(() => (today ? buildRiskSummary(risks, range, today) : EMPTY_RISK), [risks, range, today]);

  const aiPending = useMemo(
    () => records.filter((r) => r.sentiment_source !== "ai" && r.sentiment_source !== "label").length,
    [records],
  );

  return {
    ...dashboard,
    risk,
    minDate,
    aiModel,
    aiPending,
    today,
    loading,
    error,
    storage,
    empty: !loading && records.length === 0,
    realtime,
    refresh,
  };
}
