import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import { DIMENSIONS } from "@/lib/categories";
import type { CategoryFilters as Cats, DimKey } from "@/lib/types";

interface CategoryFiltersProps {
  value: Cats;
  onChange: (key: DimKey, value: string) => void;
  onReset: () => void;
}

export function CategoryFilters({ value, onChange, onReset }: CategoryFiltersProps) {
  const activeCount = DIMENSIONS.filter((d) => value[d.key] !== "all").length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Penapis kategori
          {activeCount > 0 && (
            <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{activeCount}</span>
          )}
        </span>
        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Set semula
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {DIMENSIONS.map((d) => {
          const active = value[d.key] !== "all";
          return (
            <label key={d.key} className="relative block">
              <span className="sr-only">{d.label}</span>
              <select
                value={value[d.key]}
                onChange={(e) => onChange(d.key, e.target.value)}
                title={d.label}
                className={`h-9 w-full appearance-none rounded-lg border pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 ${
                  active
                    ? "border-indigo-300 bg-indigo-50 font-medium text-indigo-800"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <option value="all">{d.allLabel}</option>
                {d.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {d.label}: {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </label>
          );
        })}
      </div>
    </div>
  );
}
