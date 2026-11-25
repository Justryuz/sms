"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { optionLabel } from "@/lib/categories";
import { PLATFORM_META, SENTIMENT_META, platformMeta } from "@/lib/constants";
import type { SentimentRecord } from "@/lib/types";
import { Card } from "./Card";

const STEP = 10;

interface LiveFeedTableProps {
  rows: SentimentRecord[];
  tag: string | null;
  onClearTag: () => void;
  loading: boolean;
  live: boolean;
}

function PlatformBadge({ platform }: { platform: string }) {
  const m = platformMeta(platform);
  const known = platform in PLATFORM_META;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${
        known && platform === "x" ? m.className : `ring-1 ring-inset ${m.className}`
      }`}
    >
      <span className="font-bold">{m.short}</span>
      {m.label !== m.short && m.label}
    </span>
  );
}

export function LiveFeedTable({ rows, tag, onClearTag, loading, live }: LiveFeedTableProps) {
  const [visible, setVisible] = useState(STEP);

  const action = (
    <div className="flex items-center gap-2">
      {tag && (
        <button
          onClick={onClearTag}
          className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700"
        >
          {tag}
          <X className="h-3 w-3" />
          <span className="sr-only">Buang tapisan topik</span>
        </button>
      )}
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
        {live && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        )}
        {rows.length.toLocaleString("en-US")} rekod
      </span>
    </div>
  );

  return (
    <Card title="Suapan Langsung (Live Mentions Feed)" action={action} className="h-full">
      {loading ? (
        <div className="h-72 animate-pulse rounded-lg bg-slate-100" />
      ) : rows.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-500">Tiada sebutan sepadan dengan tapisan semasa.</p>
      ) : (
        <>
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-4 font-medium">Tarikh Crawl</th>
                  <th className="pb-2 pr-4 font-medium">Platform</th>
                  <th className="pb-2 pr-4 font-medium">Komen</th>
                  <th className="pb-2 pr-4 font-medium">Sentimen</th>
                  <th className="pb-2 text-right font-medium">Keyakinan AI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.slice(0, visible).map((r) => (
                  <tr key={r.external_id} className="align-top hover:bg-slate-50">
                    <td className="whitespace-nowrap py-3 pr-4 font-mono text-xs text-slate-600">{r.crawl_date}</td>
                    <td className="py-3 pr-4">
                      <PlatformBadge platform={r.platform} />
                      {r.engagement_count > 0 && (
                        <div
                          className="mt-1 whitespace-nowrap text-[11px] text-slate-500"
                          title={`${r.likes ?? 0} suka, ${r.comments ?? 0} komen${r.shares ? `, ${r.shares} kongsi` : ""}`}
                        >
                          ♥ {r.likes ?? 0} · 💬 {r.comments ?? 0}
                        </div>
                      )}
                    </td>
                    <td className="max-w-[340px] py-3 pr-4 text-slate-800">
                      <p className="line-clamp-2">{r.content}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(r.topics ?? [])
                          .filter((t) => t !== "lain")
                          .map((t) => (
                            <span key={t} className="rounded bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-700">
                              {optionLabel("topic", t)}
                            </span>
                          ))}
                        {(r.districts?.length ? r.districts : (r.states ?? [])).slice(0, 3).map((s) => (
                          <span key={s} className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
                            📍 {s}
                          </span>
                        ))}
                        {r.source && r.source_type !== "sosial" && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{r.source}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${SENTIMENT_META[r.sentiment].pill}`}
                      >
                        {SENTIMENT_META[r.sentiment].label}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {r.sentiment_source === "ai" ? (
                        <span className="font-semibold text-slate-900" title="Dikelas oleh model AI">
                          {Math.round(r.confidence_score * 100)}%
                        </span>
                      ) : r.sentiment_source === "label" ? (
                        <span className="font-semibold text-slate-900" title="Label daripada fail asal">
                          {Math.round(r.confidence_score * 100)}%
                        </span>
                      ) : (
                        <span
                          className="whitespace-nowrap text-xs text-slate-400"
                          title="Anggaran kata kunci; menunggu pengelasan AI"
                        >
                          {Math.round(r.confidence_score * 100)}% · KK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visible < rows.length && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setVisible((v) => v + STEP)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Papar lagi ({Math.min(STEP, rows.length - visible)})
              </button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
