"use client";
import { useEffect, useRef } from "react";
import { Sighting, GovFile } from "@/lib/db";

let L: typeof import("leaflet") | null = null;

const SHAPE_COLOR: Record<string, string> = {
  light: "#ffe066",
  triangle: "#a78bfa",
  fireball: "#fb923c",
  sphere: "#38bdf8",
  disk: "#34d399",
  oval: "#f472b6",
  cigar: "#94a3b8",
  formation: "#f59e0b",
  circle: "#e879f9",
  unknown: "#6b7280",
  other: "#6b7280",
};

function getColor(shape: string): string {
  return SHAPE_COLOR[shape] ?? "#c4b5fd";
}

interface Props {
  sightings: Sighting[];
  onSelect: (s: Sighting) => void;
  govFiles: GovFile[];
  onSelectGov: (f: GovFile) => void;
  showGov: boolean;
}

export default function UFOMap({ sightings, onSelect, govFiles, onSelectGov, showGov }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const govLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || initRef.current) return;
    initRef.current = true;

    let map: import("leaflet").Map;

    import("leaflet").then((mod) => {
      if (!containerRef.current) return;
      L = mod.default ?? mod;

      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      map = L.map(containerRef.current, {
        center: [38, -97],
        zoom: 4,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { maxZoom: 19 }
      ).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.control.attribution({ position: "bottomleft" }).addTo(map).setPrefix(
        '<a href="https://nuforc.org" target="_blank">NUFORC</a>'
      );

      layerRef.current = L.layerGroup().addTo(map);
      govLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
    });

    return () => {
      if (map) {
        map.remove();
        mapRef.current = null;
        layerRef.current = null;
        govLayerRef.current = null;
        initRef.current = false;
      }
    };
  }, []);

  // Sightings layer
  useEffect(() => {
    if (!mapRef.current || !L || !layerRef.current) return;
    layerRef.current.clearLayers();

    for (const s of sightings) {
      if (!s.lat || !s.lng) continue;
      const color = getColor(s.shape);

      const marker = L!.circleMarker([s.lat, s.lng], {
        radius: 4,
        fillColor: color,
        color: color,
        weight: 0,
        fillOpacity: 0.75,
      });

      marker.on("click", () => onSelect(s));
      marker.bindTooltip(
        `<b class="capitalize">${s.shape}</b><br>${[s.city, s.state].filter(Boolean).join(", ") || s.country}`,
        { className: "ufo-tooltip", sticky: true }
      );

      layerRef.current.addLayer(marker);
    }
  }, [sightings, onSelect]);

  // Gov files layer
  useEffect(() => {
    if (!mapRef.current || !L || !govLayerRef.current) return;
    govLayerRef.current.clearLayers();

    if (!showGov) return;

    for (const f of govFiles) {
      if (!f.lat || !f.lng) continue;

      const color = f.color || "#f97316";

      // Outer ring marker using divIcon
      const icon = L!.divIcon({
        className: "",
        html: `<div style="
          width:14px;height:14px;border-radius:50%;
          background:${color}22;
          border:2px solid ${color};
          box-shadow:0 0 8px ${color}88;
          position:relative;
        "><div style="
          width:5px;height:5px;border-radius:50%;
          background:${color};
          position:absolute;top:50%;left:50%;
          transform:translate(-50%,-50%);
        "></div></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L!.marker([f.lat, f.lng], { icon });

      marker.on("click", () => onSelectGov(f));
      marker.bindTooltip(
        `<b>${f.agency}</b><br>${f.title.slice(0, 50)}`,
        { className: "ufo-tooltip", sticky: true }
      );

      govLayerRef.current.addLayer(marker);
    }
  }, [govFiles, onSelectGov, showGov]);

  return <div ref={containerRef} className="w-full h-full" />;
}
