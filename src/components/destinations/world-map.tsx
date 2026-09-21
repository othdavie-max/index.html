"use client";

import { useEffect, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, X } from "lucide-react";
import { destinations } from "@/data/destinations";
import { formatNaira } from "@/lib/utils";
import type { Destination } from "@/types";
import type { GeoJsonObject } from "geojson";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Aliases for how world-atlas topojson names these countries.
const nameToCode: Record<string, string> = {
  "United Kingdom": "uk",
  Ireland: "ireland",
  Germany: "germany",
  Canada: "canada",
  "United States of America": "usa",
  Australia: "australia",
};

export function WorldMap() {
  const [hovered, setHovered] = useState<{ destination: Destination; x: number; y: number } | null>(null);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [selected, setSelected] = useState<Destination | null>(null);
  // world-atlas serves TopoJSON, which react-simple-maps accepts and
  // converts internally even though its public type is GeoJsonObject.
  const [geoData, setGeoData] = useState<GeoJsonObject | null>(null);
  const [mapFailed, setMapFailed] = useState(false);

  // Fetch the map topology ourselves (rather than letting <Geographies>
  // fetch it) so a slow/blocked/offline CDN falls back to the card list
  // instead of leaving an empty box, and so we never call setState from
  // inside another component's render-prop.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => !cancelled && setMapFailed(true), 8000);

    fetch(GEO_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Map data request failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        clearTimeout(timer);
        setGeoData(data);
      })
      .catch(() => !cancelled && setMapFailed(true));

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="relative">
      {/* Desktop / tablet: interactive SVG map, with a card-list fallback if it fails to load */}
      <div className={mapFailed || !geoData ? "hidden" : "hidden overflow-hidden rounded-3xl border border-navy-900/8 bg-navy-100/40 sm:block"}>
        {geoData && (
        <ComposableMap projection="geoEqualEarth" projectionConfig={{ scale: 155 }} className="w-full" style={{ height: "auto" }}>
          <Geographies geography={geoData}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const name = geo.properties?.name as string | undefined;
                const code = name ? nameToCode[name] : undefined;
                const destination = destinations.find((d) => d.code === code);
                const isHovered = hoveredCode === code;
                const fill = destination ? (isHovered ? "#C22A2F" : "#E03A3E") : isHovered ? "#B7C4DE" : "#C8D3E8";
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={(e) => {
                      setHoveredCode(code ?? null);
                      if (!destination) return;
                      setHovered({ destination, x: e.clientX, y: e.clientY });
                    }}
                    onMouseMove={(e) => {
                      if (!destination) return;
                      setHovered({ destination, x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => {
                      setHoveredCode(null);
                      setHovered(null);
                    }}
                    onClick={() => destination && setSelected(destination)}
                    fill={fill}
                    stroke="#F7F8FB"
                    strokeWidth={0.5}
                    style={{ outline: "none", cursor: destination ? "pointer" : "default", transition: "fill 200ms" }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
        )}

        {hovered && (
          <div
            className="pointer-events-none fixed z-30 w-64 rounded-xl border border-navy-900/10 bg-white p-4 shadow-xl"
            style={{ left: hovered.x + 16, top: hovered.y + 16 }}
          >
            <p className="font-display text-sm font-bold text-navy-900">
              {hovered.destination.flag} {hovered.destination.name}
            </p>
            <p className="mt-1 text-xs text-muted">
              Tuition: {formatNaira(hovered.destination.tuitionRangeNgnPerYear[0])}–{formatNaira(hovered.destination.tuitionRangeNgnPerYear[1])}/yr
            </p>
            <p className="mt-0.5 text-xs text-muted">Top course: {hovered.destination.topCourses[0]}</p>
          </div>
        )}
      </div>

      {mapFailed && (
        <div className="hidden grid-cols-3 gap-3 sm:grid">
          {destinations.map((d) => (
            <button
              key={d.code}
              onClick={() => setSelected(d)}
              className="rounded-2xl border border-navy-900/8 bg-white p-5 text-left transition-colors hover:border-red-500/30"
            >
              <span className="text-3xl">{d.flag}</span>
              <p className="mt-2 font-display text-base font-bold text-navy-900">{d.name}</p>
              <p className="mt-1 text-xs text-muted">{d.heroTagline}</p>
            </button>
          ))}
        </div>
      )}

      {/* Mobile: swipeable card list */}
      <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 sm:hidden">
        {destinations.map((d) => (
          <button
            key={d.code}
            onClick={() => setSelected(d)}
            className="w-56 shrink-0 snap-start rounded-2xl border border-navy-900/8 bg-white p-5 text-left"
          >
            <span className="text-3xl">{d.flag}</span>
            <p className="mt-2 font-display text-base font-bold text-navy-900">{d.name}</p>
            <p className="mt-1 text-xs text-muted">{d.heroTagline}</p>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="fixed inset-0 z-40 bg-navy-950/50"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-sm overflow-y-auto bg-white p-6 shadow-2xl sm:p-8"
            >
              <button onClick={() => setSelected(null)} aria-label="Close" className="rounded-full p-2 text-navy-900/50 hover:bg-navy-900/5">
                <X size={18} />
              </button>

              <span className="mt-4 block text-5xl">{selected.flag}</span>
              <h3 className="mt-3 font-display text-2xl font-bold text-navy-900">{selected.name}</h3>
              <p className="mt-2 text-sm text-muted">{selected.summary}</p>

              <dl className="mt-6 flex flex-col gap-4 border-t border-navy-900/8 pt-6 text-sm">
                <Fact label="Tuition (est.)" value={`${formatNaira(selected.tuitionRangeNgnPerYear[0])} – ${formatNaira(selected.tuitionRangeNgnPerYear[1])}/yr`} />
                <Fact label="Living costs (est.)" value={`${formatNaira(selected.livingCostsNgnPerYear[0])} – ${formatNaira(selected.livingCostsNgnPerYear[1])}/yr`} />
                <Fact label="Intakes" value={selected.intakes.join(", ")} />
                <Fact label="Post-study work" value={selected.postStudyWork} />
                <Fact label="Top courses" value={selected.topCourses.slice(0, 4).join(", ")} />
              </dl>

              <Link
                href={`/destinations/${selected.slug}`}
                className="mt-8 flex items-center justify-center gap-2 rounded-full bg-red-500 px-6 py-3 text-sm font-medium text-white hover:bg-red-600"
              >
                Full country guide <ArrowUpRight size={16} />
              </Link>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-navy-900">{value}</dd>
    </div>
  );
}
