#!/usr/bin/env node
/**
 * Builds the game's geographic data from the geoBoundaries gbOpen release for Nigeria.
 *
 *   source    : geoBoundaries gbOpen NGA ADM1 + ADM2 (underlying data: GRID3 Nigeria, boundary year 2022)
 *   licence   : Creative Commons Attribution 4.0 International (CC BY 4.0)
 *   commit    : wmgeolab/geoBoundaries @ 9469f09
 *
 * Usage:  node scripts/build-geo.mjs [cacheDir]
 *
 * What it does (nothing is invented — every polygon comes from the source):
 *   1. downloads the two GeoJSON files (verifying SHA-256) unless already in cacheDir
 *   2. assigns each LGA to a state by LARGEST GEOMETRIC OVERLAP (the ADM2 file has no parent field)
 *   3. checks that every state/FCT has the officially published number of LGAs (774 total) — aborts otherwise
 *   4. topology-preserving simplification (mapshaper), dissolves LGAs into state shapes so borders match exactly
 *   5. projects (equirectangular, cos(lat0) corrected) and writes compact SVG path data
 *
 * Outputs:
 *   src/game/data/generated/admin.json   ids / names / parents / centroids (imported by the engine)
 *   public/game/geo.json                 SVG paths (fetched by the map at runtime, cached for offline use)
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = resolve(process.argv[2] ?? join(ROOT, ".geo-cache"));
const COMMIT = "9469f09";
const BASE = `https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/${COMMIT}/releaseData/gbOpen/NGA`;
const SOURCES = {
  adm1: { url: `${BASE}/ADM1/geoBoundaries-NGA-ADM1.geojson`, sha256: "64fa218ac3d453cc1e66412ff461c5dfa1a4a1ade0da93b239a9891b587d28f9" },
  adm2: { url: `${BASE}/ADM2/geoBoundaries-NGA-ADM2.geojson`, sha256: "bef7f2cfa45e012f4772eaa61c7b99e5188aeba4d5c6badae7e9f9aae8c02fcd" },
};

/** Officially published LGA counts (36 states + FCT = 774). Used ONLY to validate the dataset. */
const EXPECTED_LGAS = {
  "NG-AB": 17, "NG-AD": 21, "NG-AK": 31, "NG-AN": 21, "NG-BA": 20, "NG-BY": 8, "NG-BE": 23, "NG-BO": 27,
  "NG-CR": 18, "NG-DE": 25, "NG-EB": 13, "NG-ED": 18, "NG-EK": 16, "NG-EN": 17, "NG-GO": 11, "NG-IM": 27,
  "NG-JI": 27, "NG-KD": 23, "NG-KN": 44, "NG-KT": 34, "NG-KE": 21, "NG-KO": 21, "NG-KW": 16, "NG-LA": 20,
  "NG-NA": 13, "NG-NI": 25, "NG-OG": 20, "NG-ON": 18, "NG-OS": 30, "NG-OY": 33, "NG-PL": 17, "NG-RI": 23,
  "NG-SO": 23, "NG-TA": 16, "NG-YO": 17, "NG-ZA": 14, "NG-FC": 6,
};

const SCALE = 10; // 1 map unit = 0.01 degree-ish * ... (see project()); integer path coordinates are in 1/SCALE units
const UNITS_PER_DEGREE = 160; // map units per degree of latitude

const sha = (buf) => createHash("sha256").update(buf).digest("hex");

async function fetchSource(name, { url, sha256 }) {
  mkdirSync(CACHE, { recursive: true });
  const file = join(CACHE, `${name}.geojson`);
  if (!existsSync(file)) {
    console.log(`downloading ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`download failed ${res.status} ${url}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  const got = sha(readFileSync(file));
  if (got !== sha256) throw new Error(`${name}: checksum mismatch (${got})`);
  return file;
}

const ms = (...args) => execFileSync("npx", ["--yes", "mapshaper@0.7.98", ...args], { stdio: ["ignore", "inherit", "inherit"], maxBuffer: 1 << 28 });

const slug = (s) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// ---------------------------------------------------------------- 1-4: mapshaper
const adm1 = await fetchSource("adm1", SOURCES.adm1);
const adm2 = await fetchSource("adm2", SOURCES.adm2);
const work = join(CACHE, "work");
mkdirSync(work, { recursive: true });

ms("-i", adm1, "name=st", "-rename-fields", "stateName=shapeName,stateISO=shapeISO",
   "-i", adm2, "name=lga", "snap",
   "-join", "st", "largest-overlap", "fields=stateName,stateISO", "target=lga",
   "-target", "lga",
   "-simplify", "10%", "weighted", "keep-shapes",
   "-o", join(work, "lga.json"), "format=geojson", "precision=0.0001",
   "-points", "inner", "+", "name=lgapts",
   "-o", join(work, "lga_pts.json"), "target=lgapts", "format=geojson", "precision=0.0001",
   "-target", "lga",
   "-dissolve", "stateISO", "copy-fields=stateName",
   "-o", join(work, "states.json"), "format=geojson", "precision=0.0001",
   "-points", "inner", "+", "name=stpts",
   "-o", join(work, "st_pts.json"), "target=stpts", "format=geojson", "precision=0.0001");

const lgaFc = JSON.parse(readFileSync(join(work, "lga.json"), "utf8"));
const lgaPts = JSON.parse(readFileSync(join(work, "lga_pts.json"), "utf8"));
const stFc = JSON.parse(readFileSync(join(work, "states.json"), "utf8"));
const stPts = JSON.parse(readFileSync(join(work, "st_pts.json"), "utf8"));

// ---------------------------------------------------------------- validation
if (lgaFc.features.length !== 774) throw new Error(`expected 774 LGAs, got ${lgaFc.features.length}`);
if (stFc.features.length !== 37) throw new Error(`expected 37 states+FCT, got ${stFc.features.length}`);
const counts = {};
for (const f of lgaFc.features) {
  const iso = f.properties.stateISO;
  if (!iso) throw new Error(`LGA ${f.properties.shapeName} has no parent`);
  counts[iso] = (counts[iso] ?? 0) + 1;
}
for (const [iso, n] of Object.entries(EXPECTED_LGAS)) {
  if (counts[iso] !== n) throw new Error(`${iso}: expected ${n} LGAs, got ${counts[iso]}`);
}

// ---------------------------------------------------------------- 5: projection + path data
const LAT0 = 9.1;
const COS = Math.cos((LAT0 * Math.PI) / 180);
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
const project = ([lon, lat]) => [lon * COS * UNITS_PER_DEGREE, -lat * UNITS_PER_DEGREE];
for (const f of stFc.features) {
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const p of polys) for (const ring of p) for (const c of ring) {
    const [x, y] = project(c);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
}
const PAD = 4;
const ox = minX - PAD, oy = minY - PAD;
const W = Math.ceil(maxX - minX + 2 * PAD), H = Math.ceil(maxY - minY + 2 * PAD);
const toGrid = (c) => { const [x, y] = project(c); return [Math.round((x - ox) * SCALE), Math.round((y - oy) * SCALE)]; };

function pathOf(geom) {
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  let d = "";
  let bb = [Infinity, Infinity, -Infinity, -Infinity];
  for (const poly of polys) for (const ring of poly) {
    let prev = null, out = "", pts = 0;
    for (let i = 0; i < ring.length - 1; i++) { // drop closing duplicate
      const g = toGrid(ring[i]);
      if (prev && g[0] === prev[0] && g[1] === prev[1]) continue;
      out += prev ? `l${g[0] - prev[0]} ${g[1] - prev[1]}` : `M${g[0]} ${g[1]}`;
      prev = g; pts++;
      bb = [Math.min(bb[0], g[0]), Math.min(bb[1], g[1]), Math.max(bb[2], g[0]), Math.max(bb[3], g[1])];
    }
    if (pts >= 3) d += out + "z";
  }
  return { d, bb };
}
const areaKm2 = (geom) => {
  // spherical-ish planar area in km² using the same projection (1 unit = 111.32/160 km of latitude)
  const kmPerUnit = 111.32 / UNITS_PER_DEGREE;
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  let total = 0;
  for (const poly of polys) poly.forEach((ring, idx) => {
    let a = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const [x1, y1] = project(ring[i]); const [x2, y2] = project(ring[i + 1]);
      a += x1 * y2 - x2 * y1;
    }
    total += (idx === 0 ? 1 : -1) * Math.abs(a / 2);
  });
  return Math.round(total * kmPerUnit * kmPerUnit);
};
const ptOf = (fc, val, prop) => {
  const f = fc.features.find((x) => x.properties[prop] === val);
  if (!f) throw new Error(`missing interior point for ${val}`);
  return toGrid(f.geometry.coordinates);
};

const stateIdOf = (iso) => iso; // ISO 3166-2:NG codes are the stable state ids
const states = stFc.features.map((f) => {
  const iso = f.properties.stateISO;
  const { d, bb } = pathOf(f.geometry);
  return { id: stateIdOf(iso), sourceName: f.properties.stateName, d, bb, c: ptOf(stPts, iso, "stateISO"), areaKm2: areaKm2(f.geometry) };
}).sort((a, b) => a.id.localeCompare(b.id));

const seen = new Set();
const lgas = lgaFc.features.map((f) => {
  const p = f.properties;
  const id = `${p.stateISO}-${slug(p.shapeName)}`;
  if (seen.has(id)) throw new Error(`duplicate LGA id ${id}`);
  seen.add(id);
  const { d, bb } = pathOf(f.geometry);
  return { id, name: p.shapeName, stateId: p.stateISO, sourceId: p.shapeID, d, bb, c: ptOf(lgaPts, p.shapeID, "shapeID"), areaKm2: areaKm2(f.geometry) };
}).sort((a, b) => a.id.localeCompare(b.id));

const attribution = {
  title: "geoBoundaries gbOpen — Nigeria ADM1 (states) and ADM2 (local government areas)",
  underlyingSource: "GRID3 Nigeria (boundary year 2022; source data updated 2023-02-26)",
  licence: "Creative Commons Attribution 4.0 International (CC BY 4.0)",
  licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
  upstream: "https://www.geoboundaries.org/ · https://github.com/wmgeolab/geoBoundaries (commit " + COMMIT + ")",
  citation: "Runfola, D. et al. (2020) geoBoundaries: A global database of political administrative boundaries. PLoS ONE 15(4): e0231866.",
  processing: "Parent state assigned by largest geometric overlap; topology-preserving simplification (mapshaper 0.7.98, 10% weighted Visvalingam, keep-shapes); states dissolved from LGAs; equirectangular projection. Geometry is simplified for display and must not be used for surveying or legal boundary determination.",
  checksums: { adm1: SOURCES.adm1.sha256, adm2: SOURCES.adm2.sha256 },
  verification: "All 37 units (36 states + FCT) verified against officially published LGA counts; total 774.",
};
const projection = { type: "equirectangular", lat0: LAT0, unitsPerDegree: UNITS_PER_DEGREE, scale: SCALE, width: W, height: H };

mkdirSync(join(ROOT, "src/game/data/generated"), { recursive: true });
mkdirSync(join(ROOT, "public/game"), { recursive: true });

const admin = {
  attribution, projection,
  states: states.map((s) => ({ id: s.id, sourceName: s.sourceName, areaKm2: s.areaKm2, c: s.c })),
  lgas: lgas.map((l) => ({ id: l.id, name: l.name, stateId: l.stateId, sourceId: l.sourceId, areaKm2: l.areaKm2, c: l.c })),
};
writeFileSync(join(ROOT, "src/game/data/generated/admin.json"), JSON.stringify(admin));
const geo = {
  attribution, projection,
  states: states.map((s) => ({ id: s.id, d: s.d, bb: s.bb, c: s.c })),
  lgas: lgas.map((l) => ({ id: l.id, s: l.stateId, d: l.d, bb: l.bb, c: l.c })),
};
writeFileSync(join(ROOT, "public/game/geo.json"), JSON.stringify(geo));
console.log(`OK: ${states.length} states/FCT, ${lgas.length} LGAs, viewBox ${W * SCALE}x${H * SCALE}`);
