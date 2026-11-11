// Art direction: Flemish Masters realism. Photographic materials carry the
// surface detail; these tints set the actual colours (final colour = tint x
// texture detail), so the palette stays under our control: warm brick,
// whitewash, Diest's brown iron sandstone, clay and slate roofs, deep greens.

import * as THREE from 'three';
import { hash01 } from '../core/math';

const c = (hex: string) => new THREE.Color(hex);

export interface Surface {
  /** material layer name in the texture set */
  mat: string;
  tints: THREE.Color[];
}

const S = (mat: string, ...tints: string[]): Surface => ({ mat, tints: tints.map(c) });

export const WALL = {
  brickRed: S('brickRed', '#8c4a36', '#7f4131', '#99553b', '#a15f41', '#86503c'),
  brickOld: S('brickOld', '#8f6248', '#9b6d4f', '#84573f'),
  brickDark: S('brickDark', '#5f3b2e', '#6b4335', '#553429'),
  whitewash: S('brickWhite', '#d6d0c0', '#cdc6b4', '#dfd9ca', '#c8bfa9'),
  plaster: S('plaster', '#d6ccb6', '#cbbd9c', '#c7b497', '#d3beab', '#bfb39a'),
  ironstone: S('stone', '#6a4628', '#5f3e23', '#73502f'),
  limestone: S('stone', '#cdc2ab', '#c2b69d'),
  barn: S('brickDark', '#5a4234', '#66503f', '#4f3a2e'),
};

export const ROOF = {
  clay: S('roofClay', '#9f4f31', '#8f4429', '#ad5a37', '#94502f', '#a3613f'),
  slate: S('roofSlate', '#3e4149', '#474b53', '#363940', '#4a4a4e'),
  thatchish: S('roofClay', '#7d5a3a', '#86603c'),
};

export const IRONSTONE = WALL.ironstone.tints[0];
export const IRONSTONE_DARK = c('#5c3d22');
export const GOLD = c('#c9a24a');

export function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(hash01(seed) * arr.length) % arr.length];
}

/** Land cover → ground material layer + tint choices. */
export const LAND: Record<string, Surface> = {
  farm: S('meadow', '#9a8750', '#6c7c44', '#8f8a50', '#a39257', '#61723f', '#807a48'),
  soil: S('dirt', '#6d5940', '#77614a', '#5f4d38'),
  farmyard: S('rough', '#7d7052'),
  meadow: S('meadow', '#5a6b3c', '#63733f', '#536238'),
  grass: S('grass', '#55683a', '#5b6e3d'),
  wood: S('forest', '#3d4a2b', '#445030'),
  orchard: S('grass', '#566a3a'),
  vineyard: S('rough', '#6d7a44'),
  res: S('grass', '#586b3d', '#5e7040'),
  ind: S('rough', '#77705c'),
  /** yards and squares inside the town walls */
  townYard: S('dirt', '#786a55', '#716450', '#7f705a'),
  townSquare: S('cobble', '#858076', '#8d877b'),
  cemetery: S('grass', '#52663b'),
  park: S('grass', '#506537'),
  wet: S('rough', '#4f6a48'),
  scrub: S('rough', '#5f7040'),
};

export const ROAD: Record<string, { mat: string; tint: string }> = {
  cobble: { mat: 'cobble', tint: '#8a8479' },
  dirt: { mat: 'dirt', tint: '#93805f' },
  path: { mat: 'dirt', tint: '#9a8866' },
  rail: { mat: 'dirt', tint: '#5f564b' },
};
