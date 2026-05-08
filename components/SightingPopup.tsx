"use client";
import { Sighting } from "@/lib/db";

interface Props {
  sighting: Sighting;
  onClose: () => void;
}

const SHAPE_ICONS: Record<string, string> = {
  light: "💡", triangle: "△", circle: "○", fireball: "🔥",
  sphere: "●", disk: "◎", oval: "⬭", cigar: "▬",
  formation: "⁘", cylinder: "⬜", diamond: "◇", chevron: "⌃",
  rectangle: "▭", cone: "△", cross: "✚", teardrop: "💧",
};

function formatDuration(secs: number | null): string {
  if (!secs) return "Unknown";
  if (secs < 60) return `${Math.round(secs)}s`;
  if (secs < 3600) return `${Math.round(secs / 60)}m`;
  return `${(secs / 3600).toFixed(1)}h`;
}

export default function SightingPopup({ sighting, onClose }: Props) {
  const icon = SHAPE_ICONS[sighting.shape] ?? "🛸";
  const location = [sighting.city, sighting.state, sighting.country]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0d0d1a] border border-[#2a2a4a] rounded-2xl p-5 md:p-6 max-w-md w-full shadow-2xl shadow-purple-900/20 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors text-xl"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{icon}</span>
          <div>
            <div className="text-xs uppercase tracking-widest text-purple-400 mb-0.5">
              UFO Sighting
            </div>
            <h2 className="text-white text-lg font-semibold capitalize">
              {sighting.shape} — {location || "Unknown location"}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <Stat label="Date" value={sighting.datetime || "Unknown"} />
          <Stat label="Duration" value={formatDuration(sighting.duration_seconds)} />
          <Stat label="Shape" value={sighting.shape || "Unknown"} className="capitalize" />
          <Stat label="Coordinates" value={`${sighting.lat.toFixed(2)}, ${sighting.lng.toFixed(2)}`} />
        </div>

        <div className="bg-[#13132a] rounded-xl p-3 border border-[#2a2a4a]">
          <div className="text-xs uppercase tracking-widest text-gray-500 mb-1">Witness Report</div>
          {sighting.comments ? (
            <p className="text-gray-300 text-sm leading-relaxed line-clamp-6">
              {sighting.comments}
            </p>
          ) : (
            <p className="text-gray-600 text-sm italic">No further information available.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className="bg-[#13132a] rounded-lg p-2.5 border border-[#2a2a4a]">
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`text-white text-sm font-medium truncate ${className}`}>{value}</div>
    </div>
  );
}
