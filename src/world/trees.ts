// Trees as lit impostors: two crossed, alpha-tested quads per tree, textured
// from an atlas rendered from real 3D trees in Blender (tools/blender/make_trees.py).
// The atlas holds, per species row, a 0-degree and a 90-degree view with matching
// normal maps, so each quad shows the tree from its own side and is lit properly.

import * as THREE from 'three';

export interface TreeSpecies {
  name: string;
  row: number;
  height: number;
  width: number;
  quadHeight: number;
  quadWidth: number;
}

export interface TreeAtlas {
  albedo: THREE.Texture;
  normal: THREE.Texture;
  cols: number;
  rows: number;
  species: Record<string, TreeSpecies>;
}

export interface TreeItem {
  x: number;
  y: number;
  z: number;
  species: string;
  scale: number;
  rot: number;
  /** brightness / hue variation */
  tint: THREE.Color;
}

const asset = (p: string) => new URL(p, document.baseURI).toString();

export async function loadTreeAtlas(renderer: THREE.WebGLRenderer): Promise<TreeAtlas | null> {
  try {
    const res = await fetch(asset('textures/trees/trees.json'));
    if (!res.ok) return null;
    const meta = (await res.json()) as { cols: number; rows: number; species: TreeSpecies[] };
    const loader = new THREE.TextureLoader();
    const [albedo, normal] = await Promise.all([
      loader.loadAsync(asset('textures/trees/trees_albedo.png')),
      loader.loadAsync(asset('textures/trees/trees_normal.png')),
    ]);
    for (const t of [albedo, normal]) {
      t.colorSpace = THREE.NoColorSpace;
      t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      t.premultiplyAlpha = false;
    }
    const species: Record<string, TreeSpecies> = {};
    for (const s of meta.species) species[s.name] = s;
    return { albedo, normal, cols: meta.cols, rows: meta.rows, species };
  } catch {
    return null;
  }
}

function crossedQuads() {
  const pos: number[] = [], uv: number[] = [], nrm: number[] = [], view: number[] = [], right: number[] = [];
  const quad = (rx: number, rz: number, v: number) => {
    // right axis (rx, 0, rz); face normal = up x right... pick (rz, 0, -rx)
    const nx = -rz, nz = rx;
    const corners: [number, number][] = [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 0], [0.5, 1], [-0.5, 1]];
    for (const [s, t] of corners) {
      pos.push(rx * s, t, rz * s);
      uv.push(s + 0.5, t);
      nrm.push(nx, 0, nz);
      view.push(v);
      right.push(rx, 0, rz);
    }
  };
  quad(1, 0, 0);
  quad(0, 1, 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('aView', new THREE.Float32BufferAttribute(view, 1));
  g.setAttribute('aRight', new THREE.Float32BufferAttribute(right, 3));
  return g;
}

const VERT_PARS = /* glsl */ `
attribute float aView;
attribute vec3 aRight;
attribute float aRow;
varying vec2 vTUv;
varying vec3 vTRight;
varying vec3 vTFace;
varying vec3 vTPos;`;

const vertBody = (cols: number, rows: number) => /* glsl */ `
{
  // inset slightly so neighbouring atlas cells never bleed in
  vec2 cuv = clamp(uv, 0.004, 0.996);
  vTUv = vec2((aView + cuv.x) / ${cols.toFixed(1)}, 1.0 - (aRow + 1.0 - cuv.y) / ${rows.toFixed(1)});
  mat3 m3 = mat3(modelMatrix) * mat3(instanceMatrix);
  vTRight = normalize(m3 * aRight);
  vTFace = normalize(m3 * normal);
  vTPos = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
}`;

export class TreeRenderer {
  private geo = crossedQuads();
  material: THREE.MeshStandardMaterial;
  private depthMaterial: THREE.MeshDepthMaterial;

  constructor(private atlas: TreeAtlas) {
    const uniforms = { uTreeAlb: { value: atlas.albedo }, uTreeNrm: { value: atlas.normal } };
    this.material = new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0, side: THREE.DoubleSide, alphaTest: 0.42 });
    this.material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${VERT_PARS}`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>\n${vertBody(atlas.cols, atlas.rows)}`);
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
uniform sampler2D uTreeAlb;
uniform sampler2D uTreeNrm;
varying vec2 vTUv;
varying vec3 vTRight;
varying vec3 vTFace;
varying vec3 vTPos;`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
{
  vec4 t = texture2D(uTreeAlb, vTUv);
  diffuseColor.rgb *= pow(t.rgb, vec3(2.2));
  // mipmapping thins foliage out with distance; compensate so far trees stay full
  float dist = length(vTPos - cameraPosition);
  diffuseColor.a = t.a * (1.0 + 1.4 * smoothstep(80.0, 900.0, dist));
}`,
        )
        .replace(
          '#include <normal_fragment_maps>',
          `#include <normal_fragment_maps>
{
  vec3 n = texture2D(uTreeNrm, vTUv).xyz * 2.0 - 1.0;
  vec3 fn = gl_FrontFacing ? vTFace : -vTFace;
  vec3 wN = normalize(vTRight * n.x + vec3(0.0, 1.0, 0.0) * n.y + fn * n.z);
  // lean towards "up" a little so the two crossed quads shade as one crown
  wN = normalize(mix(wN, vec3(0.0, 1.0, 0.0), 0.22));
  normal = normalize((viewMatrix * vec4(wN, 0.0)).xyz);
}`,
        );
    };
    this.material.customProgramCacheKey = () => 'belfort-tree';

    this.depthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaTest: 0.42, side: THREE.DoubleSide });
    this.depthMaterial.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${VERT_PARS}`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>\n${vertBody(atlas.cols, atlas.rows)}`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform sampler2D uTreeAlb;\nvarying vec2 vTUv;')
        .replace('#include <alphatest_fragment>', 'diffuseColor.a = texture2D(uTreeAlb, vTUv).a;\n#include <alphatest_fragment>');
    };
    this.depthMaterial.customProgramCacheKey = () => 'belfort-tree-depth';
  }

  build(items: TreeItem[]): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(this.geo.clone(), this.material, items.length);
    const rows = new Float32Array(items.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    items.forEach((it, i) => {
      const sp = this.atlas.species[it.species] ?? Object.values(this.atlas.species)[0];
      q.setFromAxisAngle(up, it.rot);
      m.compose(new THREE.Vector3(it.x, it.y, it.z), q, new THREE.Vector3(sp.quadWidth * it.scale, sp.quadHeight * it.scale, sp.quadWidth * it.scale));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, it.tint);
      rows[i] = sp.row;
    });
    mesh.geometry.setAttribute('aRow', new THREE.InstancedBufferAttribute(rows, 1));
    mesh.customDepthMaterial = this.depthMaterial;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    return mesh;
  }
}
