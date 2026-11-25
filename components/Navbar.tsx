import { BarChart3, CloudDownload, Loader2, LogOut, Search, Upload, UserCircle2 } from "lucide-react";
import { logout } from "@/lib/api";

interface NavbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  onImportClick: () => void;
  onSyncClick: () => void;
  syncing: boolean;
}

export function Navbar({ search, onSearchChange, onImportClick, onSyncClick, syncing }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-3 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold leading-tight text-slate-900 sm:text-lg">
              Sistem Analisis Sentimen Media Sosial
            </h1>
            <span className="mt-0.5 inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200">
              Sumber: Muse.ai Crawler
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 xl:w-72 xl:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari kata kunci atau #hashtag..."
              aria-label="Cari kata kunci atau hashtag"
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <button
            onClick={onSyncClick}
            disabled={syncing}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudDownload className="h-4 w-4" />}
            <span>{syncing ? "Menyegerak..." : "Sync Google Drive"}</span>
          </button>

          <button
            onClick={onImportClick}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-3 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <Upload className="h-4 w-4" />
            <span>Import Data Harian</span>
          </button>

          <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white pl-2 pr-3">
            <UserCircle2 className="h-6 w-6 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">Admin User</span>
            <button
              onClick={() => void logout()}
              title="Log keluar"
              aria-label="Log keluar"
              className="ml-1 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
