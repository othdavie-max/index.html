// Projects the Natural Earth 1:110m world (via world-atlas) into compact SVG paths for the in-game world map.
import { readFileSync, writeFileSync } from "node:fs";
import { feature } from "topojson-client";
import { geoNaturalEarth1, geoPath } from "d3-geo";

const topo = JSON.parse(readFileSync("node_modules/world-atlas/countries-110m.json", "utf8"));
const fc = feature(topo, topo.objects.countries);
fc.features = fc.features.filter((f) => f.properties.name !== "Antarctica");
const W = 1000, H = 520;
const proj = geoNaturalEarth1().fitSize([W, H], fc);
const path = geoPath(proj).digits(1);
// ISO 3166 numeric → our league ids
const IDS = { 840: "us", 156: "cn", 276: "de", 356: "in", 392: "jp", 826: "gb", 250: "fr", 76: "br", 643: "ru", 682: "sa", 792: "tr", 410: "kr", 360: "id", 484: "mx", 124: "ca", 36: "au", 784: "ae", 818: "eg", 710: "za", 231: "et", 404: "ke", 288: "gh", 566: "NG" };
const out = fc.features.map((f) => { const d = path(f); const c = path.centroid(f); return d ? { id: IDS[Number(f.id)] ?? null, n: f.properties.name, d, c: [Math.round(c[0]), Math.round(c[1])] } : null; }).filter(Boolean);
writeFileSync("src/fixit/data/worldMap.json", JSON.stringify({ w: W, h: H, c: out }));
console.log(`${out.length} countries, ${(JSON.stringify(out).length / 1024).toFixed(0)} KB, mapped ${out.filter((x) => x.id).length}`);
