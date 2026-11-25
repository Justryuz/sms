/** "Cili Merah/Hijau" -> "cili-merah-hijau", "Kelapa Tua" -> "kelapa-tua". */
export function commoditySlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "cili-merah-hijau" -> "Cili Merah Hijau" */
export function commodityLabel(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export type BandKey = "hijau" | "kuning" | "merah" | "tiada";

/** Band daripada data; jika kosong, anggar daripada skor risiko (Hijau <45, Kuning <70, Merah >=70). */
export function bandKey(band: string, risk: number | null): BandKey {
  const b = band.trim().toLowerCase();
  if (b.startsWith("hijau") || b === "green") return "hijau";
  if (b.startsWith("kuning") || b === "yellow" || b === "amber") return "kuning";
  if (b.startsWith("merah") || b === "red") return "merah";
  if (b) return "tiada";
  if (risk === null) return "tiada";
  return risk >= 70 ? "merah" : risk >= 45 ? "kuning" : "hijau";
}

export const BAND_META: Record<BandKey, { label: string; pill: string; dot: string }> = {
  hijau: { label: "Hijau", pill: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  kuning: { label: "Kuning", pill: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  merah: { label: "Merah", pill: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-500" },
  tiada: { label: "Tiada data", pill: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400" },
};
