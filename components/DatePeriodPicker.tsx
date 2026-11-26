"use client";

import { useMemo } from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, dateWindow } from "@/lib/analytics";
import { DATE_PICK_OPTIONS, DATE_PRESET_OPTIONS } from "@/lib/constants";
import { defaultRange, describeWindow, listWeeks, shiftRange, weekStart } from "@/lib/period";
import type { DateMode, DateRange } from "@/lib/types";

interface DatePeriodPickerProps {
  value: DateRange;
  onChange: (v: DateRange) => void;
  /** Tarikh data terkini (had atas) */
  today: string | null;
  /** Tarikh data terawal (had bawah) */
  minDate: string | null;
}

const inputCls =
  "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100";

function NavButton({ dir, disabled, onClick }: { dir: -1 | 1; disabled: boolean; onClick: () => void }) {
  const Icon = dir < 0 ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir < 0 ? "Tempoh sebelumnya" : "Tempoh seterusnya"}
      title={dir < 0 ? "Sebelumnya" : "Seterusnya"}
      className="flex h-10 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function DatePeriodPicker({ value, onChange, today, minDate }: DatePeriodPickerProps) {
  // Sebelum data dimuatkan, `today` null: pemilih dipaparkan tetapi dimatikan.
  // (Elak `new Date()` semasa pra-render halaman.)
  const ready = today !== null;
  const max = today ?? "";
  const min = minDate ?? (today ? addDays(today, -365) : "");
  const weeks = useMemo(() => (ready ? listWeeks(min, max) : []), [ready, min, max]);
  const win = ready ? dateWindow(value, max) : null;
  const summary = win ? describeWindow(win) : null;

  const canPrev = win !== null && win.start !== null && win.start > min;
  const canNext = win !== null && win.start !== null && win.end < max;
  const shift = (dir: -1 | 1) => onChange(shiftRange(value, dir));
  const pickable = ready && (value.mode === "day" || value.mode === "week" || value.mode === "custom");

  return (
    <div className="flex w-full flex-col gap-1.5 sm:w-auto">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative block w-full sm:w-auto">
          <span className="sr-only">Julat tarikh</span>
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            value={value.mode}
            disabled={!ready}
            onChange={(e) => onChange(defaultRange(e.target.value as DateMode, max))}
            className={`${inputCls} w-full appearance-none pl-9 pr-9 sm:min-w-[220px]`}
          >
            <optgroup label="Pantas">
              {DATE_PRESET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Pilih sendiri">
              {DATE_PICK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </label>

        {pickable && (
          <div className="flex w-full items-center gap-1.5 sm:w-auto">
            <NavButton dir={-1} disabled={!canPrev} onClick={() => shift(-1)} />

            {value.mode === "day" && (
              <input
                type="date"
                aria-label="Tarikh"
                value={value.date}
                min={min}
                max={max}
                onChange={(e) => e.target.value && onChange({ mode: "day", date: e.target.value })}
                className={`${inputCls} min-w-0 flex-1 sm:flex-none`}
              />
            )}

            {value.mode === "week" && (
              <label className="relative block min-w-0 flex-1 sm:flex-none">
                <span className="sr-only">Minggu</span>
                <select
                  value={value.start}
                  onChange={(e) => onChange({ mode: "week", start: e.target.value })}
                  className={`${inputCls} w-full appearance-none pr-9 sm:min-w-[250px]`}
                >
                  {!weeks.some((w) => w.start === value.start) && (
                    <option value={value.start}>{value.start}</option>
                  )}
                  {weeks.map((w) => (
                    <option key={w.start} value={w.start}>
                      {w.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </label>
            )}

            {value.mode === "custom" && (
              <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:flex-none">
                <input
                  type="date"
                  aria-label="Dari tarikh"
                  value={value.start}
                  min={min}
                  max={max}
                  onChange={(e) => e.target.value && onChange({ ...value, start: e.target.value })}
                  className={`${inputCls} min-w-0 flex-1`}
                />
                <span className="text-sm text-slate-400">–</span>
                <input
                  type="date"
                  aria-label="Hingga tarikh"
                  value={value.end}
                  min={min}
                  max={max}
                  onChange={(e) => e.target.value && onChange({ ...value, end: e.target.value })}
                  className={`${inputCls} min-w-0 flex-1`}
                />
              </div>
            )}

            <NavButton dir={1} disabled={!canNext} onClick={() => shift(1)} />

            {value.mode === "week" && weekStart(max) !== value.start && (
              <button
                type="button"
                onClick={() => onChange({ mode: "week", start: weekStart(max) })}
                className="h-10 shrink-0 rounded-lg px-2.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
              >
                Minggu ini
              </button>
            )}
            {value.mode === "day" && value.date !== max && (
              <button
                type="button"
                onClick={() => onChange({ mode: "day", date: max })}
                className="h-10 shrink-0 rounded-lg px-2.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
              >
                Terkini
              </button>
            )}
          </div>
        )}
      </div>

      {summary && (
        <p className="text-xs text-slate-500">
          Tempoh: <span className="font-medium text-slate-700">{summary.current}</span>
          {summary.previous && <> · dibanding {summary.previous}</>}
        </p>
      )}
    </div>
  );
}
