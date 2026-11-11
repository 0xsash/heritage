// Converts raw OpenStreetMap Overpass JSON dumps into a compact world file
// the game loads at runtime. Coordinates become local metres around an origin
// (Grote Markt, Diest). Map data © OpenStreetMap contributors, ODbL.
//
// Usage: node tools/osm/build-world.mjs <raw-dir> [out-file]
//   <raw-dir> must contain b1.json b2.json b3.json roads.json water.json land.json misc.json
//   (see tools/osm/fetch.sh)

import fs from 'node:fs';
import path from 'node:path';

const rawDir = process.argv[2];
const outFile = process.argv[3] ?? 'public/world/diest.json';
if (!rawDir) {
  console.error('usage: node tools/osm/build-world.mjs <raw-dir> [out-file]');
  process.exit(1);
}

// Origin: Grote Markt, Diest.
const LAT0 = 50.98505;
const LON0 = 5.05095;
const MX = Math.cos((LAT0 * Math.PI) / 180) * 111320;
const MZ = 110574;
// x = east, z = south (three.js: -z is north)
const proj = (p) => [
  Math.round((p.lon - LON0) * MX * 10) / 10,
  Math.round(-(p.lat - LAT0) * MZ * 10) / 10,
];

const load = (f) => {
  const p = path.join(rawDir, f);
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8')).elements;
};

// ---------- geometry helpers ----------
function simplify(pts, tol) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let maxD = 0, idx = -1;
    const [ax, az] = pts[a], [bx, bz] = pts[b];
    const dx = bx - ax, dz = bz - az;
    const len2 = dx * dx + dz * dz || 1e-9;
    for (let i = a + 1; i < b; i++) {
      const [px, pz] = pts[i];
      let t = ((px - ax) * dx + (pz - az) * dz) / len2;
      t = Math.max(0, Math.min(1, t));
      const ex = ax + t * dx - px, ez = az + t * dz - pz;
      const d = ex * ex + ez * ez;
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > tol * tol && idx > 0) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

function area(ring) {
  let s = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    s += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  }
  return s / 2;
}

function centroid(ring) {
  let x = 0, z = 0;
  for (const p of ring) { x += p[0]; z += p[1]; }
  return [Math.round((x / ring.length) * 10) / 10, Math.round((z / ring.length) * 10) / 10];
}

// Closed ring from a way geometry (drops duplicate closing point).
function ringOf(geom, tol = 0.35) {
  if (!geom || geom.length < 4) return null;
  const a = geom[0], b = geom[geom.length - 1];
  if (a.lat !== b.lat || a.lon !== b.lon) return null;
  let pts = geom.slice(0, -1).map(proj);
  pts = simplify([...pts, pts[0]], tol).slice(0, -1);
  if (pts.length < 3) return null;
  // normalise winding to counter-clockwise in x/z (positive area by our formula)
  if (area(pts) < 0) pts.reverse();
  return pts;
}

// Join a multipolygon relation's outer member ways into closed rings.
function outerRings(rel, tol) {
  const segs = (rel.members || [])
    .filter((m) => m.type === 'way' && (m.role === 'outer' || m.role === '') && m.geometry)
    .map((m) => m.geometry.slice());
  const rings = [];
  const key = (p) => p.lat.toFixed(7) + ',' + p.lon.toFixed(7);
  while (segs.length) {
    let cur = segs.shift();
    let guard = 0;
    while (key(cur[0]) !== key(cur[cur.length - 1]) && guard++ < 500) {
      const endK = key(cur[cur.length - 1]);
      const i = segs.findIndex((s) => key(s[0]) === endK || key(s[s.length - 1]) === endK);
      if (i < 0) break;
      let s = segs.splice(i, 1)[0];
      if (key(s[0]) !== endK) s = s.reverse();
      cur = cur.concat(s.slice(1));
    }
    const r = ringOf(cur, tol);
    if (r) rings.push(r);
  }
  return rings;
}

function lineOf(geom, tol = 0.8) {
  if (!geom || geom.length < 2) return null;
  const pts = simplify(geom.map(proj), tol);
  return pts.length >= 2 ? pts : null;
}

const flat = (pts) => pts.flat();

// ---------- buildings ----------
const LEVEL_H = 3.0;
const TYPE_LEVELS = {
  house: 2, detached: 2, semidetached_house: 2, terrace: 2.5, residential: 2.5,
  apartments: 4, commercial: 3, retail: 2, office: 4, school: 3, hospital: 4,
  hotel: 4, civic: 3, public: 3, townhall: 3, train_station: 2,
  industrial: 2.7, warehouse: 2.5, farm: 2, barn: 2.3, farm_auxiliary: 1.6,
  garage: 1, garages: 1, shed: 1, roof: 1.3, carport: 1, bungalow: 1, hut: 1,
  church: 6, chapel: 2.5, basilica: 9, cathedral: 10, presbytery: 2.5,
  bunker: 2, ruins: 2, greenhouse: 1.3, service: 1, kiosk: 1, toilets: 1,
};
const FLAT_TYPES = new Set([
  'industrial', 'warehouse', 'retail', 'commercial', 'office', 'apartments', 'hospital',
  'school', 'garage', 'garages', 'roof', 'carport', 'service', 'greenhouse', 'bunker',
  'supermarket', 'sports_hall', 'kiosk', 'toilets',
]);

function buildingRecord(id, ring, t) {
  const type = t.building === 'yes' ? (t.amenity === 'place_of_worship' ? 'church' : 'yes') : t.building;
  const a = Math.abs(area(ring));
  if (a < 6) return null;
  let h;
  if (t.height && !isNaN(parseFloat(t.height))) h = parseFloat(t.height);
  else if (t['building:levels'] && !isNaN(parseFloat(t['building:levels'])))
    h = parseFloat(t['building:levels']) * LEVEL_H + (t['roof:levels'] ? parseFloat(t['roof:levels']) * 2 : 0);
  else {
    let lv = TYPE_LEVELS[type];
    if (lv === undefined) lv = a < 40 ? 1 : a < 220 ? 2 : a < 900 ? 2.5 : 3;
    h = lv * LEVEL_H;
  }
  h = Math.max(2.4, Math.min(h, 90));
  let roof = t['roof:shape'];
  if (!roof) {
    if (FLAT_TYPES.has(type) || a > 1600) roof = 'flat';
    else if (type === 'church' || type === 'chapel' || type === 'basilica') roof = 'gabled';
    else roof = a < 700 ? 'gabled' : 'hipped';
  }
  const rec = { id, p: flat(ring), h: Math.round(h * 10) / 10, r: roof[0] };
  if (type !== 'yes') rec.t = type;
  if (t.name) rec.n = t.name;
  if (t.historic) rec.hist = 1;
  return rec;
}

const buildings = [];
const seenB = new Set();
for (const f of ['b1.json', 'b2.json', 'b3.json']) {
  for (const e of load(f)) {
    if (seenB.has(e.type + e.id)) continue;
    seenB.add(e.type + e.id);
    const t = e.tags || {};
    if (!t.building) continue;
    if (e.type === 'way') {
      const ring = ringOf(e.geometry, 0.3);
      if (!ring) continue;
      const r = buildingRecord(e.id, ring, t);
      if (r) buildings.push(r);
    } else if (e.type === 'relation') {
      for (const ring of outerRings(e, 0.3)) {
        const r = buildingRecord(e.id, ring, t);
        if (r) buildings.push(r);
      }
    }
  }
}

// ---------- roads & rail ----------
const ROAD_W = {
  motorway: 14, trunk: 12, primary: 10, secondary: 8.5, tertiary: 7.5,
  unclassified: 6, residential: 6, living_street: 5, pedestrian: 7, service: 4,
  track: 3, footway: 2, path: 1.8, cycleway: 2.2, steps: 2, bridleway: 2.2,
  motorway_link: 7, trunk_link: 7, primary_link: 7, secondary_link: 6, tertiary_link: 6,
};
const roads = [];
for (const e of load('roads.json')) {
  const t = e.tags || {};
  const line = lineOf(e.geometry, 0.6);
  if (!line) continue;
  if (t.railway === 'rail') { roads.push({ k: 'rail', w: 3.2, p: flat(line) }); continue; }
  const k = t.highway;
  if (!ROAD_W[k]) continue;
  const r = { k, w: ROAD_W[k], p: flat(line) };
  if (t.bridge && t.bridge !== 'no') r.b = 1;
  if (t.tunnel && t.tunnel !== 'no') continue;
  if (t.name) r.n = t.name;
  roads.push(r);
}

// ---------- water ----------
const WATER_W = { river: 14, canal: 12, stream: 3, ditch: 1.6, drain: 1.6, brook: 2.5 };
const waterLines = [];
const waterAreas = [];
for (const e of load('water.json')) {
  const t = e.tags || {};
  if (e.type === 'way' && t.waterway && WATER_W[t.waterway] && !(t.tunnel && t.tunnel !== 'no')) {
    const line = lineOf(e.geometry, 1);
    if (line) {
      const w = t.width && !isNaN(parseFloat(t.width)) ? parseFloat(t.width) : WATER_W[t.waterway];
      waterLines.push({ k: t.waterway, w, p: flat(line), ...(t.name ? { n: t.name } : {}) });
    }
  }
  if (t.natural === 'water' || t.waterway === 'riverbank' || t.water) {
    const rings = e.type === 'way' ? [ringOf(e.geometry, 0.8)].filter(Boolean) : outerRings(e, 0.8);
    for (const r of rings) if (Math.abs(area(r)) > 20) waterAreas.push(flat(r));
  }
}

// ---------- land cover ----------
const LAND_KIND = {
  farmland: 'farm', farmyard: 'farmyard', meadow: 'meadow', grass: 'grass', village_green: 'grass',
  forest: 'wood', wood: 'wood', orchard: 'orchard', vineyard: 'vineyard', residential: 'res',
  industrial: 'ind', commercial: 'ind', retail: 'ind', railway: 'ind', construction: 'ind',
  cemetery: 'cemetery', park: 'park', garden: 'park', wetland: 'wet', scrub: 'scrub',
  heath: 'scrub', grassland: 'meadow', recreation_ground: 'grass', allotments: 'orchard',
  pitch: 'grass', plant_nursery: 'orchard', greenhouse_horticulture: 'farm', basin: 'grass',
  military: 'ind', religious: 'park', brownfield: 'scrub', greenfield: 'meadow', quarry: 'scrub',
};
const land = [];
for (const e of load('land.json')) {
  const t = e.tags || {};
  const kind = LAND_KIND[t.landuse] || LAND_KIND[t.natural] || LAND_KIND[t.leisure];
  if (!kind) continue;
  const rings = e.type === 'way' ? [ringOf(e.geometry, 1.5)].filter(Boolean) : outerRings(e, 1.5);
  for (const r of rings) {
    if (Math.abs(area(r)) < 40) continue;
    land.push({ k: kind, p: flat(r) });
  }
}
// Draw big areas first so small ones sit on top.
land.sort((a, b) => Math.abs(area(unflat(b.p))) - Math.abs(area(unflat(a.p))));
function unflat(p) {
  const o = [];
  for (let i = 0; i < p.length; i += 2) o.push([p[i], p[i + 1]]);
  return o;
}

// ---------- points of interest ----------
const pois = [];
const seenP = new Set();
const addPoi = (name, pos, kind) => {
  if (seenP.has(name)) return;
  seenP.add(name);
  pois.push({ n: name, x: pos[0], z: pos[1], k: kind });
};
for (const e of load('misc.json')) {
  const t = e.tags || {};
  if (!t.name) continue;
  const kind = t.place || t.historic || t.amenity || 'poi';
  if (e.type === 'node') addPoi(t.name, proj(e), kind);
  else if (e.type === 'way') {
    const r = ringOf(e.geometry, 2) || (e.geometry ? e.geometry.map(proj) : null);
    if (r) addPoi(t.name, centroid(r), kind);
  } else if (e.type === 'relation') {
    const rs = outerRings(e, 2);
    if (rs.length) addPoi(t.name, centroid(rs[0]), kind);
  }
}
for (const b of buildings) {
  if (b.n && (b.t === 'church' || b.t === 'basilica' || b.t === 'chapel' || b.hist || b.t === 'townhall' || b.t === 'bunker')) {
    addPoi(b.n, centroid(unflat(b.p)), b.t || 'historic');
  }
}

// ---------- bounds ----------
let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
for (const b of buildings) for (let i = 0; i < b.p.length; i += 2) {
  minX = Math.min(minX, b.p[i]); maxX = Math.max(maxX, b.p[i]);
  minZ = Math.min(minZ, b.p[i + 1]); maxZ = Math.max(maxZ, b.p[i + 1]);
}

const world = {
  name: 'Diest & the Demer valley',
  attribution: 'Map data © OpenStreetMap contributors (ODbL)',
  origin: { lat: LAT0, lon: LON0 },
  bounds: [Math.floor(minX), Math.floor(minZ), Math.ceil(maxX), Math.ceil(maxZ)],
  buildings, roads, waterLines, waterAreas, land, pois,
};
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(world));
console.log(
  `wrote ${outFile}: ${buildings.length} buildings, ${roads.length} roads, ` +
  `${waterLines.length} waterways, ${waterAreas.length} water areas, ${land.length} land, ${pois.length} pois, ` +
  `${(fs.statSync(outFile).size / 1e6).toFixed(2)} MB, bounds ${world.bounds}`
);
