// Loads the packed PBR material strips (see tools/assets/build_textures.py)
// into texture arrays: one layer per material.
//   albedo array: rgb = base colour (sRGB bytes, decoded in the shader), a = roughness
//   normal array: rgb = tangent-space normal (OpenGL), a = ambient occlusion

import * as THREE from 'three';

export interface MaterialInfo {
  name: string;
  source: string;
  metres: number;
  mean: [number, number, number];
}

export interface MaterialSet {
  albedo: THREE.DataArrayTexture;
  normal: THREE.DataArrayTexture;
  layers: MaterialInfo[];
  /** layer index by name */
  index: Record<string, number>;
  /** uniforms shared by every material that samples this set */
  uniforms: {
    uAlbedoArr: { value: THREE.DataArrayTexture };
    uNormalArr: { value: THREE.DataArrayTexture };
    uMean: { value: THREE.Vector3[] };
    uScale: { value: number[] };
  };
}

const asset = (p: string) => new URL(p, document.baseURI).toString();

async function loadPixels(url: string, size: number, layers: number): Promise<Uint8ClampedArray> {
  const res = await fetch(asset(url));
  if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
  const bmp = await createImageBitmap(await res.blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size * layers;
  const g = canvas.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return g.getImageData(0, 0, canvas.width, canvas.height).data;
}

function arrayTexture(data: Uint8Array, size: number, layers: number, aniso: number) {
  const t = new THREE.DataArrayTexture(data, size, size, layers);
  t.format = THREE.RGBAFormat;
  t.type = THREE.UnsignedByteType;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = aniso;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

export async function loadMaterialSet(
  name: 'build' | 'ground',
  meta: Record<string, MaterialInfo[]>,
  renderer: THREE.WebGLRenderer,
  lowQ: boolean,
): Promise<MaterialSet> {
  const layers = meta[name];
  const n = layers.length;
  const size = lowQ ? 512 : 1024;
  const [alb, nrm, orm] = await Promise.all([
    loadPixels(`textures/${name}_albedo.jpg`, size, n),
    loadPixels(`textures/${name}_normal.jpg`, size, n),
    loadPixels(`textures/${name}_orm.jpg`, size, n),
  ]);
  const a = new Uint8Array(alb.buffer);
  const b = new Uint8Array(nrm.buffer);
  for (let i = 0; i < a.length; i += 4) {
    a[i + 3] = orm[i + 1]; // roughness
    b[i + 3] = orm[i]; // ambient occlusion
  }
  const aniso = Math.min(lowQ ? 2 : 8, renderer.capabilities.getMaxAnisotropy());
  const albedo = arrayTexture(a, size, n, aniso);
  const normal = arrayTexture(b, size, n, aniso);
  const index: Record<string, number> = {};
  layers.forEach((l, i) => (index[l.name] = i));
  return {
    albedo, normal, layers, index,
    uniforms: {
      uAlbedoArr: { value: albedo },
      uNormalArr: { value: normal },
      uMean: { value: layers.map((l) => new THREE.Vector3(...l.mean)) },
      uScale: { value: layers.map((l) => l.metres) },
    },
  };
}

/** GLSL shared by every surface shader. */
export const GLSL_COMMON = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
vec3 toLinear(vec3 c) { return pow(c, vec3(2.2)); }
`;
