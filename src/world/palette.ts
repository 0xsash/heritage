// Art direction: "Flemish Primitives in motion" — warm brick, whitewash and
// Diest's brown iron sandstone, dark slate and red clay roofs, jewel-tone water.

import * as THREE from 'three';
import { hash01 } from '../core/math';

const c = (hex: string) => new THREE.Color(hex);

export const WALLS_TOWN = ['#9b4b36', '#8e3f2f', '#a85b3e', '#b8714c', '#7d3b2c', '#e6dccb', '#d9cdb5', '#c9b089', '#9a7448'].map(c);
export const WALLS_RURAL = ['#e9e1d0', '#ded3bd', '#a3533b', '#c1a27a', '#8f4934', '#efe8da'].map(c);
export const WALLS_IND = ['#6e5a44', '#5d4a38', '#7a6650', '#857262'].map(c);
export const IRONSTONE = c('#8a6236'); // Diest's brown iron sandstone (ijzerzandsteen)
export const IRONSTONE_DARK = c('#6d4a28');
export const ROOFS_TILE = ['#9b4429', '#8a3a24', '#a9532f', '#7a3322'].map(c);
export const ROOFS_SLATE = ['#3c3f47', '#464a52', '#33363d'].map(c);
export const ROOF_FLAT = c('#5a5550');
export const GOLD = c('#c9a24a');

export function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(hash01(seed) * arr.length) % arr.length];
}

export const LAND_COLORS: Record<string, string[]> = {
  farm: ['#b9a65a', '#9fae58', '#8d7a4a', '#c8b46a', '#a4b46a', '#7f9a4c', '#b39a5a'],
  farmyard: ['#8f8a64'],
  meadow: ['#7fa04f', '#88a957', '#75984a'],
  grass: ['#7ea24e', '#86a956'],
  wood: ['#3f5e2c', '#45632f'],
  orchard: ['#6f9346'],
  vineyard: ['#7c8a45'],
  res: ['#8b9a5e', '#8f9862'],
  ind: ['#8a8470'],
  cemetery: ['#6f8a4e'],
  park: ['#6e9a48'],
  wet: ['#5f7d55'],
  scrub: ['#6f8045'],
};

export const ROAD_COLORS: Record<string, string> = {
  primary: '#8f877a', secondary: '#938a7c', tertiary: '#968c7d', motorway: '#837d73', trunk: '#837d73',
  residential: '#9a8f7e', living_street: '#a08f78', pedestrian: '#a3927a', unclassified: '#9c8d77',
  service: '#a1947f', track: '#9c8463', path: '#a48d6a', footway: '#a8977c', cycleway: '#a08a6b',
  steps: '#a08f78', bridleway: '#9c8463', rail: '#5a4f45',
};
