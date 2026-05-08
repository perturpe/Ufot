"use client";

export interface Filters {
  shape: string;
  yearFrom: number;
  yearTo: number;
  country: string;
}

const MIN_YEAR = 1940;
const MAX_YEAR = 2026;

const SHAPES = [
  "all", "light", "triangle", "circle", "fireball", "sphere",
  "disk", "oval", "formation", "cigar", "cylinder", "diamond",
  "chevron", "rectangle", "unknown", "other",
];

const COUNTRIES = [
  { value: "all", label: "All Countries" },
  { value: "us", label: "United States" },
  { value: "ca", label: "Canada" },
  { value: "gb", label: "United Kingdom" },
  { value: "au", label: "Australia" },
];

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  totalShown: number;
  mobile?: boolean;
}

export default function FilterPanel({ filters, onChange, totalShown, mobile = false }: Props) {
  const set = (partial: Partial<Filters>) => onChange({ ...filters, ...partial });

  const range = MAX_YEAR - MIN_YEAR;
  const leftPct  = ((filters.yearFrom - MIN_YEAR) / range) * 100;
  const rightPct = ((filters.yearTo   - MIN_YEAR) / range) * 100;

  const outer = mobile
    ? "w-full p-4"
    : "absolute top-4 left-4 z-[1000] w-64 bg-[#0d0d1a]/95 backdrop-blur border border-[#2a2a4a] rounded-2xl p-4 shadow-xl shadow-black/40";

  return (
    <div className={outer}>
      {!mobile && (
        <div className="flex items-center gap-2 mb-4">
          <img src="/logo.svg" alt="UFO Tracker" className="w-8 h-8 rounded-full" />
          <span className="text-white font-bold text-lg tracking-tight">UFO Tracker</span>
        </div>
      )}

      <div className="text-xs text-purple-400 mb-4 font-mono">
        {totalShown.toLocaleString()} sightings shown
      </div>

      {/* Shape */}
      <div className="mb-3">
        <label className="text-xs uppercase tracking-widest text-gray-500 block mb-1.5">Shape</label>
        <select
          value={filters.shape}
          onChange={(e) => set({ shape: e.target.value })}
          className="w-full bg-[#13132a] border border-[#2a2a4a] text-white text-sm rounded-lg px-3 py-2 capitalize focus:outline-none focus:border-purple-500"
        >
          {SHAPES.map((s) => (
            <option key={s} value={s} className="capitalize">{s === "all" ? "All shapes" : s}</option>
          ))}
        </select>
      </div>

      {/* Country */}
      <div className="mb-3">
        <label className="text-xs uppercase tracking-widest text-gray-500 block mb-1.5">Country</label>
        <select
          value={filters.country}
          onChange={(e) => set({ country: e.target.value })}
          className="w-full bg-[#13132a] border border-[#2a2a4a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
        >
          {COUNTRIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Dual-range year slider */}
      <div className="mb-1">
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs uppercase tracking-widest text-gray-500">Year Range</label>
          <span className="text-xs text-purple-400 font-mono tabular-nums">
            {filters.yearFrom} – {filters.yearTo}
          </span>
        </div>

        {/* Track */}
        <div className="relative h-5 flex items-center">
          {/* Background track */}
          <div className="absolute w-full h-1 rounded-full bg-[#2a2a4a]" />
          {/* Active range highlight */}
          <div
            className="absolute h-1 rounded-full bg-purple-500"
            style={{ left: `${leftPct}%`, width: `${rightPct - leftPct}%` }}
          />

          {/* Min thumb */}
          <input
            type="range"
            min={MIN_YEAR}
            max={MAX_YEAR}
            value={filters.yearFrom}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              set({ yearFrom: Math.min(v, filters.yearTo - 1) });
            }}
            className="dual-range-thumb absolute w-full"
          />

          {/* Max thumb */}
          <input
            type="range"
            min={MIN_YEAR}
            max={MAX_YEAR}
            value={filters.yearTo}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              set({ yearTo: Math.max(v, filters.yearFrom + 1) });
            }}
            className="dual-range-thumb absolute w-full"
          />
        </div>

        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>{MIN_YEAR}</span><span>{MAX_YEAR}</span>
        </div>
      </div>
    </div>
  );
}
