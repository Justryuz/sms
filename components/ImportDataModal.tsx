"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, UploadCloud, X } from "lucide-react";
import { importFiles } from "@/lib/api";
import { toYmd } from "@/lib/analytics";
import type { IngestResult } from "@/lib/types";
import { useToast } from "./Toast";

interface ImportDataModalProps {
  open: boolean;
  onClose: () => void;
  onImported: (result: IngestResult) => void;
}

const ACCEPT = /\.(json|jsonl|csv)$/i;

export function ImportDataModal({ open, onClose, onImported }: ImportDataModalProps) {
  return open ? <ModalBody onClose={onClose} onImported={onImported} /> : null;
}

function ModalBody({ onClose, onImported }: Omit<ImportDataModalProps, "open">) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState(() => toYmd(new Date()));
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const valid = [...list].filter((f) => ACCEPT.test(f.name));
    if (valid.length < list.length) setError("Hanya fail .json, .jsonl atau .csv diterima.");
    else setError(null);
    setFiles((prev) => {
      const names = new Set(prev.map((f) => `${f.name}:${f.size}`));
      return [...prev, ...valid.filter((f) => !names.has(`${f.name}:${f.size}`))];
    });
  };

  const submit = async () => {
    if (!date || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const result = await importFiles(files, date);
      toast(
        "success",
        `Import selesai: ${result.inserted} rekod baharu, ${result.updated} dikemas kini` +
          (result.skipped ? `, ${result.skipped} dilangkau.` : "."),
      );
      onImported(result);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import gagal.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 id="import-title" className="text-base font-semibold text-slate-900">
            Import Data Harian
          </h2>
          <button
            onClick={onClose}
            disabled={busy}
            aria-label="Tutup"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div>
            <label htmlFor="crawl-date" className="mb-1.5 block text-sm font-medium text-slate-700">
              Tarikh crawl (folder YYYY-MM-DD)
            </label>
            <input
              id="crawl-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <p className="mt-1 text-xs text-slate-500">
              Digunakan untuk rekod yang tiada tarikh sendiri. Rekod yang ada medan tarikh mengekalkan tarikhnya.
            </p>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
            role="button"
            tabIndex={0}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
              dragging ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100"
            }`}
          >
            <UploadCloud className="mb-2 h-8 w-8 text-slate-400" />
            <p className="text-sm font-medium text-slate-700">Seret & lepas fail di sini, atau klik untuk pilih</p>
            <p className="mt-1 text-xs text-slate-500">JSON, JSONL atau CSV daripada crawl muse.ai (maks 20MB)</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".json,.jsonl,.csv"
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {files.length > 0 && (
            <ul className="space-y-2">
              {files.map((f) => (
                <li
                  key={`${f.name}:${f.size}`}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate text-slate-700">{f.name}</span>
                  <span className="shrink-0 text-xs text-slate-500">{(f.size / 1024).toFixed(1)} KB</span>
                  <button
                    onClick={() => setFiles((p) => p.filter((x) => x !== f))}
                    disabled={busy}
                    aria-label={`Buang ${f.name}`}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button
            onClick={onClose}
            disabled={busy}
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={submit}
            disabled={busy || files.length === 0 || !date}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Mengimport..." : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}
