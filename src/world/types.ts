// Shape of public/world/*.json (produced by tools/osm/build-world.mjs).
// All coordinates are local metres: x = east, z = south, origin = Grote Markt, Diest.

export interface BuildingData {
  id: number;
  /** flat ring [x0,z0,x1,z1,...], counter-clockwise, not closed */
  p: number[];
  /** eave height (m) */
  h: number;
  /** roof: 'f' flat, 'g' gabled, 'h' hipped, other letters from roof:shape */
  r: string;
  t?: string;
  n?: string;
  hist?: 1;
}

export interface RoadData {
  k: string;
  w: number;
  p: number[];
  b?: 1;
  n?: string;
}

export interface WaterLineData {
  k: string;
  w: number;
  p: number[];
  n?: string;
}

export interface LandData {
  k: string;
  p: number[];
}

export interface PoiData {
  n: string;
  x: number;
  z: number;
  k: string;
}

export interface WorldData {
  name: string;
  attribution: string;
  origin: { lat: number; lon: number };
  bounds: [number, number, number, number];
  buildings: BuildingData[];
  roads: RoadData[];
  waterLines: WaterLineData[];
  waterAreas: number[][];
  land: LandData[];
  pois: PoiData[];
}
