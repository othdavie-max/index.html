// Builds src/fixit/data/ngContext.json: what sits around and across the Nigeria map (neighbouring countries, the sea,
// Lake Chad, the Niger and Benue rivers, state capitals, big cities and the main highways), in the same grid units as
// public/game/geo.json so it lines up with the 36 states. Country shapes: Natural Earth via world-atlas (public domain).
// Rivers, the lake and roads are simplified hand traces (lon/lat), good enough for a game map, not for navigation.
import { readFileSync, writeFileSync } from "node:fs";
import { feature } from "topojson-client";

const geo = JSON.parse(readFileSync("public/game/geo.json", "utf8"));
const topo = JSON.parse(readFileSync("node_modules/world-atlas/countries-50m.json", "utf8"));
const countries = feature(topo, topo.objects.countries).features;
const ng = countries.find((f) => f.id === "566");

// calibrate: map the Natural Earth outline of Nigeria onto the bounding box of the 36 states + FCT
const bbOf = (coordsList) => { let a = [Infinity, Infinity, -Infinity, -Infinity]; for (const [x, y] of coordsList) a = [Math.min(a[0], x), Math.min(a[1], y), Math.max(a[2], x), Math.max(a[3], y)]; return a; };
const flat = (g) => (g.type === "Polygon" ? g.coordinates.flat() : g.coordinates.flat(2));
const [lon0, lat0, lon1, lat1] = bbOf(flat(ng.geometry));
const sb = geo.states.reduce((a, s) => [Math.min(a[0], s.bb[0]), Math.min(a[1], s.bb[1]), Math.max(a[2], s.bb[2]), Math.max(a[3], s.bb[3])], [Infinity, Infinity, -Infinity, -Infinity]);
const P = ([lon, lat]) => [Math.round(sb[0] + ((lon - lon0) / (lon1 - lon0)) * (sb[2] - sb[0])), Math.round(sb[1] + ((lat1 - lat) / (lat1 - lat0)) * (sb[3] - sb[1]))];

const pathOf = (geom) => {
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  let d = "";
  for (const poly of polys) for (const ring of poly) {
    // keep only rings near Nigeria (the map window)
    if (!ring.some(([x, y]) => x > -6 && x < 22 && y > -4 && y < 20)) continue;
    let prev = null, out = "";
    for (const c of ring) { const g = P(c); if (prev && Math.abs(g[0] - prev[0]) + Math.abs(g[1] - prev[1]) < 12) continue; out += prev ? `l${g[0] - prev[0]} ${g[1] - prev[1]}` : `M${g[0]} ${g[1]}`; prev = g; }
    d += out + "z";
  }
  return d;
};
const NEAR = { 204: "Benin", 562: "Niger", 148: "Chad", 120: "Cameroon", 768: "Togo", 288: "Ghana", 226: "Equatorial Guinea", 140: "Central African Rep.", 854: "Burkina Faso", 266: "Gabon", 678: "São Tomé" };
const LABEL_AT = { Benin: [2.3, 9.6], Niger: [7.5, 14.6], Chad: [15.6, 13.6], Cameroon: [12.6, 6.2], Togo: [1.05, 8.4], Ghana: [-0.6, 7.4], "Equatorial Guinea": [10.4, 1.6], "Burkina Faso": [0.4, 12.4], "Central African Rep.": [17.5, 7.0], Mali: [-1.5, 16.5], Algeria: [4.5, 19.0], Libya: [16, 19.5], Sudan: [21.5, 13.5] };
const neighbours = countries.filter((f) => f.id !== "566").map((f) => { const name = NEAR[Number(f.id)] ?? f.properties.name; return { name, d: pathOf(f.geometry), at: LABEL_AT[name] ? P(LABEL_AT[name]) : null }; }).filter((n) => n.d);

const line = (pts) => { let prev = null, d = ""; for (const c of pts) { const g = P(c); d += prev ? `L${g[0]} ${g[1]}` : `M${g[0]} ${g[1]}`; prev = g; } return d; };
// [lon, lat] traces
const NIGER = [[3.38, 11.95], [3.65, 11.62], [4.1, 11.1], [4.38, 10.55], [4.55, 10.12], [4.62, 9.86], [4.83, 9.14], [5.2, 8.96], [5.65, 8.86], [6.05, 8.62], [6.45, 8.25], [6.74, 7.8], [6.73, 7.35], [6.7, 6.9], [6.77, 6.4], [6.78, 6.1], [6.65, 5.75], [6.45, 5.4], [6.3, 5.05], [6.15, 4.6], [6.05, 4.3]];
const BENUE = [[13.15, 9.3], [12.75, 9.22], [12.47, 9.21], [12.03, 9.47], [11.6, 9.3], [11.0, 9.0], [10.4, 8.5], [9.8, 8.15], [9.2, 7.9], [8.54, 7.73], [8.0, 7.72], [7.45, 7.8], [7.0, 7.8], [6.74, 7.8]];
const KADUNA = [[8.2, 10.9], [7.75, 10.55], [7.44, 10.45], [6.9, 10.1], [6.5, 9.7], [6.25, 9.25], [6.05, 8.62]];
const SOKOTO = [[7.9, 13.0], [7.0, 12.9], [6.2, 13.0], [5.25, 13.05], [4.6, 12.65], [4.25, 12.2], [4.1, 11.1]];
const CROSS = [[9.6, 6.1], [9.0, 6.0], [8.6, 5.9], [8.3, 5.5], [8.25, 5.1], [8.3, 4.8]];
const LAKE_CHAD = [[13.62, 13.0], [13.75, 13.35], [13.95, 13.65], [14.2, 13.75], [14.45, 13.65], [14.55, 13.3], [14.4, 12.95], [14.1, 12.75], [13.8, 12.8]];
const KAINJI = [[4.48, 10.65], [4.6, 10.55], [4.65, 10.2], [4.6, 9.95], [4.5, 10.1], [4.45, 10.4]];
const ring = (pts) => line(pts) + "Z";

// capitals [stateId, city, lat, lon]
const CAP = [["NG-AB", "Umuahia", 5.53, 7.49], ["NG-AD", "Yola", 9.21, 12.48], ["NG-AK", "Uyo", 5.04, 7.93], ["NG-AN", "Awka", 6.21, 7.07], ["NG-BA", "Bauchi", 10.31, 9.84], ["NG-BY", "Yenagoa", 4.92, 6.26], ["NG-BE", "Makurdi", 7.73, 8.54], ["NG-BO", "Maiduguri", 11.85, 13.16], ["NG-CR", "Calabar", 4.96, 8.33], ["NG-DE", "Asaba", 6.2, 6.73], ["NG-EB", "Abakaliki", 6.32, 8.11], ["NG-ED", "Benin City", 6.34, 5.63], ["NG-EK", "Ado-Ekiti", 7.62, 5.22], ["NG-EN", "Enugu", 6.46, 7.55], ["NG-FC", "Abuja", 9.06, 7.49], ["NG-GO", "Gombe", 10.29, 11.17], ["NG-IM", "Owerri", 5.48, 7.03], ["NG-JI", "Dutse", 11.76, 9.34], ["NG-KD", "Kaduna", 10.52, 7.44], ["NG-KN", "Kano", 12.0, 8.52], ["NG-KT", "Katsina", 12.99, 7.6], ["NG-KE", "Birnin Kebbi", 12.45, 4.2], ["NG-KO", "Lokoja", 7.8, 6.74], ["NG-KW", "Ilorin", 8.5, 4.55], ["NG-LA", "Ikeja", 6.6, 3.35], ["NG-NA", "Lafia", 8.49, 8.52], ["NG-NI", "Minna", 9.61, 6.56], ["NG-OG", "Abeokuta", 7.15, 3.35], ["NG-ON", "Akure", 7.25, 5.19], ["NG-OS", "Osogbo", 7.77, 4.56], ["NG-OY", "Ibadan", 7.38, 3.94], ["NG-PL", "Jos", 9.9, 8.86], ["NG-RI", "Port Harcourt", 4.82, 7.03], ["NG-SO", "Sokoto", 13.06, 5.24], ["NG-TA", "Jalingo", 8.89, 11.36], ["NG-YO", "Damaturu", 11.75, 11.96], ["NG-ZA", "Gusau", 12.16, 6.66]];
const capitals = CAP.map(([state, name, lat, lon]) => ({ state, name, at: P([lon, lat]) }));
// big cities shown when zoomed out, with a rough size (millions, for the size of their glow)
const CITY = [["Lagos", 6.45, 3.39, 15], ["Kano", 12.0, 8.52, 4.2], ["Ibadan", 7.38, 3.94, 3.6], ["Abuja", 9.06, 7.49, 3.8], ["Port Harcourt", 4.82, 7.03, 3.2], ["Benin City", 6.34, 5.63, 1.8], ["Onitsha", 6.15, 6.79, 1.5], ["Aba", 5.11, 7.37, 1.2], ["Kaduna", 10.52, 7.44, 1.4], ["Maiduguri", 11.85, 13.16, 1.0], ["Warri", 5.52, 5.75, 0.8], ["Zaria", 11.11, 7.72, 0.9], ["Enugu", 6.46, 7.55, 0.9], ["Jos", 9.9, 8.86, 0.9], ["Ilorin", 8.5, 4.55, 1.0]];
const cities = CITY.map(([name, lat, lon, pop]) => ({ name, pop, at: P([lon, lat]) }));
const C = Object.fromEntries([...CITY.map(([n, la, lo]) => [n, [lo, la]]), ...CAP.map(([, n, la, lo]) => [n, [lo, la]])]);
// the trunk roads people drive every day (city to city)
const ROADS = [
  ["Lagos", "Ibadan", "Ilorin", "Jebba", "Mokwa", "Bida", "Abuja"], ["Abuja", "Kaduna", "Zaria", "Kano", "Katsina"], ["Kano", "Dutse", "Damaturu", "Maiduguri"], ["Kaduna", "Jos", "Bauchi", "Gombe", "Yola"],
  ["Lagos", "Ijebu-Ode", "Ore", "Benin City", "Asaba", "Onitsha", "Enugu", "Makurdi", "Lafia", "Abuja"], ["Onitsha", "Owerri", "Port Harcourt"], ["Enugu", "Umuahia", "Aba", "Port Harcourt"], ["Port Harcourt", "Uyo", "Calabar"],
  ["Abuja", "Lokoja", "Okene", "Benin City"], ["Ibadan", "Osogbo", "Ado-Ekiti", "Akure", "Ore"], ["Sokoto", "Gusau", "Funtua", "Zaria"], ["Sokoto", "Birnin Kebbi", "Jega", "Kontagora", "Mokwa"], ["Benin City", "Warri", "Yenagoa"],
];
Object.assign(C, { Jebba: [4.83, 9.14], Mokwa: [5.05, 9.29], Bida: [6.01, 9.08], "Ijebu-Ode": [3.92, 6.82], Ore: [4.87, 6.75], Okene: [6.23, 7.55], Funtua: [7.32, 11.52], Jega: [4.38, 12.22], Kontagora: [5.47, 10.4] });
const roads = ROADS.map((r) => ({ id: r[0] + "-" + r[r.length - 1], pts: r.map((n) => { if (!C[n]) throw new Error(`no coordinates for ${n}`); return P(C[n]); }) }));
// railways (Lagos–Ibadan and Abuja–Kaduna standard gauge exist; the rest light up when you build rail)
const RAIL = [["Lagos", "Ibadan"], ["Abuja", "Kaduna"], ["Warri", "Ajaokuta"], ["Ibadan", "Ilorin", "Minna", "Kaduna", "Kano"], ["Port Harcourt", "Aba", "Enugu", "Makurdi", "Jos", "Bauchi", "Gombe", "Maiduguri"], ["Lagos", "Benin City", "Onitsha", "Port Harcourt", "Uyo", "Calabar"]];
Object.assign(C, { Ajaokuta: [6.66, 7.56] });
const rails = RAIL.map((r, i) => ({ id: r[0] + "-" + r[r.length - 1], built: i < 3, d: line(r.map((n) => C[n])) }));

const out = {
  source: "Neighbours: Natural Earth 1:50m via world-atlas (public domain). Rivers, Lake Chad, roads and rail: simplified hand traces for the game, not for navigation.",
  neighbours, sea: P([4.5, 3.6]), seaName: "Gulf of Guinea", atlantic: P([1.6, 4.6]),
  rivers: [{ name: "River Niger", d: line(NIGER), at: P([5.6, 8.98]) }, { name: "River Benue", d: line(BENUE), at: P([10.3, 8.3]) }, { name: "Kaduna", d: line(KADUNA), at: null }, { name: "Sokoto", d: line(SOKOTO), at: null }, { name: "Cross River", d: line(CROSS), at: null }],
  lakes: [{ name: "Lake Chad", d: ring(LAKE_CHAD), at: P([14.1, 13.25]) }, { name: "Kainji Lake", d: ring(KAINJI), at: null }],
  capitals, cities, roads, rails,
};
writeFileSync("src/fixit/data/ngContext.json", JSON.stringify(out));
console.log(`ngContext.json: ${(JSON.stringify(out).length / 1024).toFixed(0)} KB, ${neighbours.length} neighbours, ${roads.length} roads, ${capitals.length} capitals`);
