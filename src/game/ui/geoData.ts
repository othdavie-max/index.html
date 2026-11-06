/** Loads the generated, license-attributed boundary geometry from /game/geo.json (served locally and cached offline). */
export interface GeoState { id: string; d: string; bb: [number, number, number, number]; c: [number, number] }
export interface GeoLga { id: string; s: string; d: string; bb: [number, number, number, number]; c: [number, number] }
export interface GeoData {
  attribution: { title: string; underlyingSource: string; licence: string; licenceUrl: string; upstream: string; citation: string; processing: string; verification: string };
  projection: { width: number; height: number; scale: number };
  states: GeoState[];
  lgas: GeoLga[];
}
let cache: Promise<GeoData> | null = null;
export function loadGeo(): Promise<GeoData> {
  if (!cache) {
    cache = fetch("/game/geo.json").then((r) => {
      if (!r.ok) throw new Error(`Map data could not be loaded (${r.status}).`);
      return r.json() as Promise<GeoData>;
    }).catch((e) => { cache = null; throw e; });
  }
  return cache;
}
export const lgasByState = (geo: GeoData): Record<string, GeoLga[]> => {
  const m: Record<string, GeoLga[]> = {};
  for (const l of geo.lgas) (m[l.s] ??= []).push(l);
  return m;
};
