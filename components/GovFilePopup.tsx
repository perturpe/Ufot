"use client";
import { GovFile } from "@/lib/db";

interface Props {
  file: GovFile;
  onClose: () => void;
}

const AGENCY_LABELS: Record<string, string> = {
  "FBI": "FBI",
  "Department of War": "Dept. of War",
  "NASA": "NASA",
  "Department of State": "State Dept.",
};

export default function GovFilePopup({ file, onClose }: Props) {
  const label = AGENCY_LABELS[file.agency] ?? file.agency;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0d0d1a] border border-[#2a2a4a] rounded-2xl p-5 md:p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors text-xl"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-3 h-3 rounded-full shrink-0 ring-2 ring-offset-1 ring-offset-[#0d0d1a]"
            style={{ backgroundColor: file.color, boxShadow: `0 0 8px ${file.color}` }}
          />
          <div>
            <div className="text-xs uppercase tracking-widest mb-0.5" style={{ color: file.color }}>
              {label} — Declassified
            </div>
            <h2 className="text-white text-sm font-semibold leading-snug pr-6">
              {file.title}
            </h2>
          </div>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <MetaBox label="Agency" value={file.agency} />
          <MetaBox label="Type" value={file.doc_type === "VID" ? "Video" : file.doc_type === "IMG" ? "Image" : "Document"} />
          <MetaBox label="Date" value={file.incident_date ?? "Unknown"} />
          <MetaBox label="Location" value={file.location_text || "Classified"} />
        </div>

        {file.redacted === 1 && (
          <div className="mb-3 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
            ⚠ Partially redacted
          </div>
        )}

        {/* Description */}
        <div className="bg-[#13132a] rounded-xl p-3 border border-[#2a2a4a] mb-4">
          <div className="text-xs uppercase tracking-widest text-gray-500 mb-1">Summary</div>
          <p className="text-gray-300 text-sm leading-relaxed">
            {file.description || "No description available."}
          </p>
        </div>

        {/* Links */}
        <div className="flex flex-col gap-2">
          {file.file_url && (
            <a
              href={file.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium border transition-all"
              style={{
                backgroundColor: `${file.color}18`,
                borderColor: `${file.color}44`,
                color: file.color,
              }}
            >
              <span>↗</span> View Official Document
            </a>
          )}
          {file.dvids_id && (
            <a
              href={`https://www.dvidshub.net/video/${file.dvids_id}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium bg-[#13132a] border border-[#2a2a4a] text-gray-300 hover:text-white transition-all"
            >
              <span>▶</span> Watch DVIDS Video
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#13132a] rounded-lg p-2.5 border border-[#2a2a4a]">
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-white text-sm font-medium truncate">{value}</div>
    </div>
  );
}
