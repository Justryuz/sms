import { Calendar, ChevronDown, Layers, Loader2, Radio, Sparkles } from "lucide-react";
import { DATE_RANGE_OPTIONS, PLATFORM_OPTIONS } from "@/lib/constants";
import type { DateRange, PlatformFilter } from "@/lib/types";

interface FilterBarProps {
  range: DateRange;
  platform: PlatformFilter;
  onRangeChange: (v: DateRange) => void;
  onPlatformChange: (v: PlatformFilter) => void;
  storage: "supabase" | "local" | null;
  today: string | null;
  realtime: boolean;
  /** Model AI yang digunakan, null jika AI tidak dikonfigurasi */
  aiModel: string | null;
  aiPending: number;
  classifying: boolean;
  onClassify: () => void;
}

interface SelectProps<T extends string> {
  label: string;
  icon: React.ReactNode;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

function Select<T extends string>({ label, icon, value, options, onChange }: SelectProps<T>) {
  return (
    <label className="relative block w-full sm:w-auto">
      <span className="sr-only">{label}</span>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:min-w-[220px]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </label>
  );
}

export function FilterBar({ range, platform, onRangeChange, onPlatformChange, storage, today, realtime, aiModel, aiPending, classifying, onClassify }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <Select
        label="Julat tarikh"
        icon={<Calendar className="h-4 w-4" />}
        value={range}
        options={DATE_RANGE_OPTIONS}
        onChange={onRangeChange}
      />
      <Select
        label="Platform"
        icon={<Layers className="h-4 w-4" />}
        value={platform}
        options={PLATFORM_OPTIONS}
        onChange={onPlatformChange}
      />
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        {today && (
          <span className="text-xs text-slate-500">
            Data terkini: <span className="font-mono font-medium text-slate-700">{today}</span>
          </span>
        )}
        {aiModel ? (
          <span
            title={`Sentimen dikelas oleh ${aiModel}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-200"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Sentimen AI: {aiModel.replace(/^.*\//, "")}
            {(aiPending > 0 || classifying) && (
              <button
                onClick={onClassify}
                disabled={classifying}
                className="ml-1 inline-flex items-center gap-1 rounded-full bg-violet-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-violet-700 disabled:opacity-70"
              >
                {classifying && <Loader2 className="h-3 w-3 animate-spin" />}
                {classifying ? "Mengelas..." : `Kelaskan ${aiPending.toLocaleString("en-US")} menunggu`}
              </button>
            )}
          </span>
        ) : (
          <span
            title="Tetapkan LLM_BASE_URL dan LLM_API_KEY dalam .env.local untuk pengelasan AI"
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200"
          >
            Sentimen: kata kunci
          </span>
        )}
        {storage === "local" && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
            Storan tempatan (.data)
          </span>
        )}
        {storage === "supabase" && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
              realtime
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-slate-100 text-slate-600 ring-slate-200"
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            {realtime ? "Supabase realtime aktif" : "Supabase"}
          </span>
        )}
      </div>
    </div>
  );
}
