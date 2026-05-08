"use client";
import { Sighting } from "@/lib/db";

const SHAPE_ICONS: Record<string, string> = {
  light: "💡", triangle: "△", circle: "○", fireball: "🔥",
  sphere: "●", disk: "◎", oval: "⬭", cigar: "▬",
  formation: "⁘", unknown: "❓", other: "•",
};

interface Props {
  sightings: Sighting[];
  onSelect: (s: Sighting) => void;
  mobile?: boolean;
}

function SightingList({ sightings, onSelect }: { sightings: Sighting[]; onSelect: (s: Sighting) => void }) {
  return (
    <div className="divide-y divide-[#2a2a4a]/50">
      {sightings.map((s) => {
        const icon = SHAPE_ICONS[s.shape] ?? "🛸";
        const location = [s.city, s.state].filter(Boolean).join(", ") || s.country || "Unknown";
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className="w-full text-left px-4 py-3 hover:bg-[#13132a] transition-colors"
          >
            <div className="flex items-start gap-2">
              <span className="text-base mt-0.5 shrink-0">{icon}</span>
              <div className="min-w-0">
                <div className="text-white text-sm font-medium truncate capitalize">
                  {s.shape} — {location}
                </div>
                <div className="text-gray-500 text-xs mt-0.5">{s.datetime}</div>
                {s.comments && (
                  <div className="text-gray-400 text-xs mt-1 line-clamp-2 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: s.comments.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)) }}
                  />
                )}
              </div>
            </div>
          </button>
        );
      })}
      {sightings.length === 0 && (
        <div className="px-4 py-6 text-gray-600 text-sm text-center">No sightings loaded</div>
      )}
    </div>
  );
}

export default function RecentFeed({ sightings, onSelect, mobile = false }: Props) {
  if (mobile) {
    return <SightingList sightings={sightings} onSelect={onSelect} />;
  }

  return (
    <div className="absolute top-4 right-4 z-[1000] w-72 bg-[#0d0d1a]/95 backdrop-blur border border-[#2a2a4a] rounded-2xl shadow-xl shadow-black/40 flex flex-col max-h-[calc(100vh-2rem)]">
      <div className="px-4 pt-4 pb-2 border-b border-[#2a2a4a] shrink-0">
        <div className="text-xs uppercase tracking-widest text-gray-500 mb-0.5">Latest Reports</div>
        <div className="text-white font-semibold">Recent Sightings</div>
      </div>
      <div className="overflow-y-auto flex-1">
        <SightingList sightings={sightings} onSelect={onSelect} />
      </div>
    </div>
  );
}
