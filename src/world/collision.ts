// Spatial hash over building footprints. Answers "how high is the solid world
// at (x,z)?" which drives on-foot movement (walls = height steps, roofs are
// walkable), flight clearance and camera collision.

import { pointInRing, roofHeight, type Footprint } from './footprint';

const CELL = 32;

export class WorldCollision {
  private cells = new Map<number, Footprint[]>();
  /** Extra solid shapes (landmark towers etc): cylinders */
  private columns: { x: number; z: number; r: number; top: number }[] = [];

  private key(ix: number, iz: number) {
    return (ix + 4096) * 8192 + (iz + 4096);
  }

  add(f: Footprint) {
    const x0 = Math.floor(f.minX / CELL), x1 = Math.floor(f.maxX / CELL);
    const z0 = Math.floor(f.minZ / CELL), z1 = Math.floor(f.maxZ / CELL);
    for (let ix = x0; ix <= x1; ix++)
      for (let iz = z0; iz <= z1; iz++) {
        const k = this.key(ix, iz);
        let list = this.cells.get(k);
        if (!list) this.cells.set(k, (list = []));
        list.push(f);
      }
  }

  addColumn(x: number, z: number, r: number, top: number) {
    this.columns.push({ x, z, r, top });
  }

  /** The building whose footprint contains (x,z), if any. */
  buildingAt(x: number, z: number): Footprint | null {
    const list = this.cells.get(this.key(Math.floor(x / CELL), Math.floor(z / CELL)));
    if (!list) return null;
    for (const f of list) {
      if (x < f.minX || x > f.maxX || z < f.minZ || z > f.maxZ) continue;
      if (pointInRing(f.ring, x, z)) return f;
    }
    return null;
  }

  /** Height of the solid surface at (x,z). Ground is y = 0. */
  heightAt(x: number, z: number): number {
    let h = 0;
    const f = this.buildingAt(x, z);
    if (f) h = roofHeight(f, x, z);
    for (const c of this.columns) {
      const dx = x - c.x, dz = z - c.z;
      if (dx * dx + dz * dz < c.r * c.r && c.top > h) h = c.top;
    }
    return h;
  }

  /** Max surface height within radius r of (x,z) (5-tap). */
  heightAround(x: number, z: number, r: number): number {
    return Math.max(
      this.heightAt(x, z),
      this.heightAt(x + r, z),
      this.heightAt(x - r, z),
      this.heightAt(x, z + r),
      this.heightAt(x, z - r),
    );
  }

  nearbyFootprints(x: number, z: number): Footprint[] {
    return this.cells.get(this.key(Math.floor(x / CELL), Math.floor(z / CELL))) ?? [];
  }
}
