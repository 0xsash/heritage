// Trees as lit impostors: one camera-facing, alpha-tested quad per tree, textured
// from an atlas rendered from real 3D trees in Blender (tools/blender/make_trees.py).
// The atlas holds, per species row, a 0-degree and a 90-degree view with matching
// normal maps; trees alternate between the two views and are lit by the scene.

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

/** One upright quad per tree; the vertex shader turns it to face the camera (or the sun, in the shadow pass). */
function treeQuad() {
  const pos: number[] = [], uv: number[] = [], nrm: number[] = [];
  const corners: [number, number][] = [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 0], [0.5, 1], [-0.5, 1]];
  for (const [s, t] of corners) {
    pos.push(s, t, 0);
    uv.push(s + 0.5, t);
    nrm.push(0, 0, 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  return g;
}

const VERT_PARS = /* glsl */ `
attribute vec2 aRow; // x = species row in the atlas, y = which of the two views
varying vec2 vTUv;
varying vec3 vTRight;
varying vec3 vTFace;
varying vec3 vTPos;`;

const vertBody = (cols: number, rows: number, shadowPass = false) => /* glsl */ `
{
  // inset slightly so neighbouring atlas cells never bleed in
  vec2 cuv = clamp(uv, 0.004, 0.996);
  vTUv = vec2((aRow.y + cuv.x) / ${cols.toFixed(1)}, 1.0 - (aRow.x + 1.0 - cuv.y) / ${rows.toFixed(1)});
  // billboard about the vertical axis
  vec3 centre = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec2 size = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
  vec3 toCam = cameraPosition - centre;
  toCam.y = 0.0;
  toCam = normalize(toCam + vec3(0.0, 0.0, 1e-5));
  vTFace = toCam;
  vTRight = vec3(toCam.z, 0.0, -toCam.x);
  ${
    shadowPass
      ? `// In the shadow pass the quad faces the sun. Set it back behind the tree so the
  // camera-facing quad never ends up half inside its own shadow.
  centre -= toCam * size.x * 0.55;`
      : ''
  }
  vTPos = centre + vTRight * position.x * size.x + vec3(0.0, position.y * size.y, 0.0);
  transformed = (inverse(modelMatrix * instanceMatrix) * vec4(vTPos, 1.0)).xyz;
}`;

export class TreeRenderer {
  private geo = treeQuad();
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
  vec3 wN = normalize(vTRight * n.x + vec3(0.0, 1.0, 0.0) * n.y + vTFace * n.z);
  // lean towards "up" a little: crowns catch the sky
  wN = normalize(mix(wN, vec3(0.0, 1.0, 0.0), 0.18));
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
        .replace('#include <begin_vertex>', `#include <begin_vertex>\n${vertBody(atlas.cols, atlas.rows, true)}`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform sampler2D uTreeAlb;\nvarying vec2 vTUv;')
        .replace('#include <alphatest_fragment>', 'diffuseColor.a = texture2D(uTreeAlb, vTUv).a;\n#include <alphatest_fragment>');
    };
    this.depthMaterial.customProgramCacheKey = () => 'belfort-tree-depth';
  }

  build(items: TreeItem[]): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(this.geo.clone(), this.material, items.length);
    const rows = new Float32Array(items.length * 2);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    items.forEach((it, i) => {
      const sp = this.atlas.species[it.species] ?? Object.values(this.atlas.species)[0];
      q.setFromAxisAngle(up, it.rot);
      m.compose(new THREE.Vector3(it.x, it.y, it.z), q, new THREE.Vector3(sp.quadWidth * it.scale, sp.quadHeight * it.scale, sp.quadWidth * it.scale));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, it.tint);
      rows[i * 2] = sp.row;
      rows[i * 2 + 1] = i % 2; // alternate the two rendered views for variety
    });
    mesh.geometry.setAttribute('aRow', new THREE.InstancedBufferAttribute(rows, 2));
    mesh.customDepthMaterial = this.depthMaterial;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    return mesh;
  }
}
