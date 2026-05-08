"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import FilterPanel, { Filters } from "@/components/FilterPanel";
import RecentFeed from "@/components/RecentFeed";
import SightingPopup from "@/components/SightingPopup";
import GovFilePopup from "@/components/GovFilePopup";
import SupportModal from "@/components/SupportModal";
import { Sighting, GovFile } from "@/lib/db";

const UFOMap = dynamic(() => import("@/components/UFOMap"), { ssr: false });

const DEFAULT_FILTERS: Filters = {
  shape: "all",
  yearFrom: 1940,
  yearTo: 2026,
  country: "all",
};

type MobilePanel = "filters" | "recent" | null;

export default function Home() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [recent, setRecent] = useState<Sighting[]>([]);
  const [govFiles, setGovFiles] = useState<GovFile[]>([]);
  const [showGov, setShowGov] = useState(true);
  const [selected, setSelected] = useState<Sighting | null>(null);
  const [selectedGov, setSelectedGov] = useState<GovFile | null>(null);
  const [showSupport, setShowSupport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dbReady, setDbReady] = useState<boolean | null>(null);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setDbReady(!d.error))
      .catch(() => setDbReady(false));
  }, []);

  useEffect(() => {
    if (!dbReady) return;
    fetch("/api/recent")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setRecent(d));
    fetch("/api/gov-files")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setGovFiles(d));
  }, [dbReady]);

  const fetchSightings = useCallback((f: Filters) => {
    if (!dbReady) return;
    const params = new URLSearchParams({
      shape: f.shape,
      yearFrom: String(f.yearFrom),
      yearTo: String(f.yearTo),
      country: f.country,
      limit: "6000",
    });
    setLoading(true);
    fetch(`/api/sightings?${params}`)
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setSightings(d))
      .finally(() => setLoading(false));
  }, [dbReady]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSightings(filters), 400);
  }, [filters, fetchSightings]);

  const handleSelect = useCallback((s: Sighting) => {
    setSelected(s);
    setSelectedGov(null);
    setMobilePanel(null);
  }, []);

  const handleSelectGov = useCallback((f: GovFile) => {
    setSelectedGov(f);
    setSelected(null);
    setMobilePanel(null);
  }, []);

  const toggleMobilePanel = (panel: MobilePanel) =>
    setMobilePanel((p) => (p === panel ? null : panel));

  return (
    <main className="relative w-screen h-screen bg-[#080810] overflow-hidden">
      {/* Map */}
      <div className="absolute inset-0">
        <UFOMap
          sightings={sightings}
          onSelect={handleSelect}
          govFiles={govFiles}
          onSelectGov={handleSelectGov}
          showGov={showGov}
        />
      </div>

      {/* Desktop: filter panel */}
      <div className="hidden md:block">
        <FilterPanel filters={filters} onChange={setFilters} totalShown={sightings.length} />
      </div>

      {/* Desktop: recent feed */}
      <div className="hidden md:block">
        <RecentFeed sightings={recent} onSelect={handleSelect} />
      </div>

      {/* Desktop: gov files toggle */}
      <div className="hidden md:flex absolute top-4 left-1/2 -translate-x-1/2 z-[1000] items-center gap-2 bg-[#0d0d1a]/95 border border-[#2a2a4a] rounded-full px-4 py-2 shadow-lg">
        <div className="w-2.5 h-2.5 rounded-full bg-[#f97316] ring-1 ring-[#f97316]/40" />
        <span className="text-gray-300 text-xs font-medium">Govt. UAP Files</span>
        <button
          onClick={() => setShowGov((v) => !v)}
          className={`relative w-9 h-5 rounded-full transition-colors ml-1 ${showGov ? "bg-[#f97316]" : "bg-[#2a2a4a]"}`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showGov ? "translate-x-4" : "translate-x-0.5"}`}
          />
        </button>
        <span className="text-gray-600 text-xs tabular-nums">{govFiles.length}</span>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="absolute bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-[1000] bg-[#0d0d1a]/90 border border-purple-500/30 rounded-full px-4 py-1.5 text-purple-300 text-xs font-mono tracking-wider">
          Loading sightings…
        </div>
      )}

      {/* DB not ready banner */}
      {dbReady === false && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="bg-[#0d0d1a] border border-red-500/30 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="text-4xl mb-3">🛸</div>
            <h2 className="text-white text-lg font-bold mb-2">Database not ready</h2>
            <p className="text-gray-400 text-sm mb-4">
              Run the seed script to load NUFORC sighting data:
            </p>
            <code className="block bg-black/50 rounded-lg px-4 py-2 text-green-400 text-sm font-mono break-all">
              python3 scripts/seed.py
            </code>
          </div>
        </div>
      )}

      {/* Desktop: support button */}
      <button
        onClick={() => setShowSupport(true)}
        className="hidden md:flex absolute bottom-4 right-4 z-[1000] items-center gap-1.5 bg-[#0d0d1a]/90 border border-purple-500/40 hover:border-purple-400 text-purple-300 hover:text-purple-200 text-xs font-medium px-3 py-2 rounded-full transition-all shadow-lg"
      >
        <span>♥</span> Support
      </button>

      {/* Desktop: legend */}
      <div className="hidden md:block absolute bottom-4 left-4 z-[1000] bg-[#0d0d1a]/90 border border-[#2a2a4a] rounded-xl px-3 py-2">
        <div className="text-xs uppercase tracking-widest text-gray-500 mb-1.5">Shape</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {[
            ["light", "#ffe066"],
            ["triangle", "#a78bfa"],
            ["fireball", "#fb923c"],
            ["sphere", "#38bdf8"],
            ["disk", "#34d399"],
            ["other", "#6b7280"],
          ].map(([shape, color]) => (
            <div key={shape} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-gray-400 text-xs capitalize">{shape}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-[#2a2a4a] mt-2 pt-2">
          <div className="text-xs uppercase tracking-widest text-gray-500 mb-1.5">Gov. Files</div>
          <div className="flex flex-col gap-1">
            {[
              ["FBI", "#ef4444"],
              ["Dept. of War", "#f97316"],
              ["NASA", "#38bdf8"],
              ["State Dept.", "#a78bfa"],
            ].map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full shrink-0 ring-1" style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }} />
                <span className="text-gray-400 text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile: bottom sheet + tab bar */}
      <div className="md:hidden absolute bottom-0 left-0 right-0 z-[1000]">
        {mobilePanel && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobilePanel(null)}
          />
        )}

        <div
          className={`absolute bottom-[56px] left-0 right-0 bg-[#0d0d1a] border-t border-[#2a2a4a] rounded-t-2xl overflow-hidden transition-transform duration-300 ease-out ${
            mobilePanel ? "translate-y-0" : "translate-y-full"
          }`}
          style={{ maxHeight: "65vh" }}
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#2a2a4a] shrink-0">
            <div>
              <div className="text-xs uppercase tracking-widest text-gray-500 mb-0.5">
                {mobilePanel === "filters" ? "Filters" : "Latest Reports"}
              </div>
              <div className="text-white font-semibold text-sm">
                {mobilePanel === "filters"
                  ? `${sightings.length.toLocaleString()} sightings shown`
                  : "Recent Sightings"}
              </div>
            </div>
            <button
              onClick={() => setMobilePanel(null)}
              className="text-gray-500 hover:text-white transition-colors text-lg w-8 h-8 flex items-center justify-center"
            >
              ✕
            </button>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: "calc(65vh - 56px)" }}>
            {mobilePanel === "filters" && (
              <FilterPanel
                filters={filters}
                onChange={setFilters}
                totalShown={sightings.length}
                mobile
              />
            )}
            {mobilePanel === "recent" && (
              <RecentFeed sightings={recent} onSelect={handleSelect} mobile />
            )}
          </div>
        </div>

        <div className="relative flex bg-[#0d0d1a]/98 border-t border-[#2a2a4a]" style={{ height: 56 }}>
          <button
            onClick={() => toggleMobilePanel("filters")}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
              mobilePanel === "filters" ? "text-purple-400" : "text-gray-500"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            <span className="text-[10px] font-medium tracking-wide">Filters</span>
          </button>

          <button
            onClick={() => toggleMobilePanel("recent")}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
              mobilePanel === "recent" ? "text-purple-400" : "text-gray-500"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="text-[10px] font-medium tracking-wide">Recent</span>
          </button>

          <button
            onClick={() => setShowGov((v) => !v)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
              showGov ? "text-[#f97316]" : "text-gray-500"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            <span className="text-[10px] font-medium tracking-wide">Gov. Files</span>
          </button>

          <button
            onClick={() => setShowSupport(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-500 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
            </svg>
            <span className="text-[10px] font-medium tracking-wide">Support</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}
      {selected && <SightingPopup sighting={selected} onClose={() => setSelected(null)} />}
      {selectedGov && <GovFilePopup file={selectedGov} onClose={() => setSelectedGov(null)} />}
    </main>
  );
}
