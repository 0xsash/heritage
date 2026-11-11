// Ground and water surface materials.
//
// Ground: world-projected PBR textures from the "ground" texture array, sampled
// at two scales to hide tiling, tinted per polygon (the vertex colour), with
// crop rows on fields and soft, ragged edges on roads and paths.
//   aMat  = material layer
//   aWall = (rowDirX, rowDirZ, 1) for fields with crop rows
//           (edge, 0, 2) for road ribbons, edge = -1..1 across the road
//           (0, 0, 0) otherwise
//
// Water: dark, reflective, with animated ripples.

import * as THREE from 'three';
import { GLSL_COMMON, type MaterialSet } from '../render/textures';

export type GroundKind = 'base' | 'land' | 'road';

export function makeGroundMaterial(set: MaterialSet, kind: GroundKind) {
  const road = kind === 'road';
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    metalness: 0,
    transparent: road,
    depthWrite: kind === 'base',
    polygonOffset: kind !== 'base',
    polygonOffsetFactor: kind === 'road' ? -4 : -2,
    polygonOffsetUnits: kind === 'road' ? -4 : -2,
  });
  const COBBLE = set.index.cobble;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, set.uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute vec3 aWall;
attribute float aMat;
varying vec3 vWall;
varying vec3 vWPos;
varying float vMat;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vWall = aWall;
vMat = aMat;
vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
precision highp sampler2DArray;
uniform sampler2DArray uAlbedoArr;
uniform sampler2DArray uNormalArr;
uniform vec3 uMean[${set.layers.length}];
uniform float uScale[${set.layers.length}];
varying vec3 vWall;
varying vec3 vWPos;
varying float vMat;
${GLSL_COMMON}
vec3 gNrm; float gRough; float gAO;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
{
  int layer = int(vMat + 0.5);
  float fl = float(layer);
  vec2 uv = vWPos.xz / uScale[layer];
  float dist = length(vWPos - cameraPosition);
  float farK = smoothstep(25.0, 320.0, dist);
  // two scales: fine detail up close, a broad rotated copy far away (hides tiling)
  vec2 uvFar = mat2(0.8, -0.6, 0.6, 0.8) * uv * 0.131 + 0.37;
  vec4 a1 = texture(uAlbedoArr, vec3(uv, fl));
  vec4 a2 = texture(uAlbedoArr, vec3(uvFar, fl));
  vec4 n1 = texture(uNormalArr, vec3(uv, fl));
  vec3 detail = mix(toLinear(a1.rgb), toLinear(a2.rgb), farK * 0.8) / uMean[layer];
  // broad natural variation so large fields are never one flat colour
  float macro = vnoise(vWPos.xz * 0.011) * 0.4 + vnoise(vWPos.xz * 0.0029 + 11.0) * 0.35 + vnoise(vWPos.xz * 0.047 + 5.0) * 0.25;
  // drier, yellower patches and darker damp ones
  vec3 dry = vec3(1.18, 1.05, 0.72), damp = vec3(0.72, 0.84, 0.78);
  diffuseColor.rgb *= clamp(detail, 0.0, 2.4) * mix(damp, dry, smoothstep(0.25, 0.75, macro));
  // vegetation and earth are matt; only worn cobbles keep a little sheen
  float minRough = layer == ${COBBLE} ? 0.55 : 0.86;
  gRough = max(mix(a1.a, 0.92, farK), minRough);
  gAO = mix(n1.a, 1.0, farK);
  vec3 nTex = n1.xyz * 2.0 - 1.0;
  nTex.xy *= layer == ${COBBLE} ? 1.0 : 0.55;
  gNrm = normalize(mix(nTex, vec3(0.0, 0.0, 1.0), farK));
  if (vWall.z > 0.5 && vWall.z < 1.5) {
    // crop rows / furrows, fading out before they alias
    float ph = dot(vWPos.xz, vWall.xy) / 0.85;
    float fade = 1.0 - smoothstep(0.08, 0.45, fwidth(ph));
    float rows = 0.5 + 0.5 * sin(ph * 6.28318);
    diffuseColor.rgb *= 1.0 - 0.3 * rows * fade;
    gNrm = normalize(gNrm + vec3(vWall.x, vWall.y, 0.0) * cos(ph * 6.28318) * 0.35 * fade);
  }
  ${
    road
      ? `// worn, ragged road edges that melt into the verge
  float ragged = (vnoise(vWPos.xz * 0.9) - 0.5) * 0.4 + (vnoise(vWPos.xz * 3.7) - 0.5) * 0.15;
  float edge = abs(vWall.x) + ragged * (1.0 - smoothstep(20.0, 160.0, dist));
  diffuseColor.a *= 1.0 - smoothstep(0.62, 0.98, edge);
  // wheel ruts and a lighter crown
  diffuseColor.rgb *= 0.9 + 0.14 * smoothstep(0.9, 0.2, abs(abs(vWall.x) - 0.45) * 2.0);`
      : ''
  }
}`,
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = gRough;')
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
{
  // ground plane tangent frame: u = +x, v = +z, image-up = -z
  vec3 wN = normalize(vec3(gNrm.x, gNrm.z, -gNrm.y));
  normal = normalize((viewMatrix * vec4(wN, 0.0)).xyz);
}`,
      )
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= mix(1.0, gAO, 0.8);');
  };
  mat.customProgramCacheKey = () => 'belfort-ground-' + kind;
  return mat;
}

export function makeWaterMaterial(shared: { uTime: { value: number } }, color: string, emissive?: string) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.06,
    metalness: 0,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
    emissive: emissive ?? '#000000',
    emissiveIntensity: emissive ? 0.5 : 0,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = shared.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uTime;
varying vec3 vWPos;
${GLSL_COMMON}
float waterH(vec2 p) {
  return vnoise(p + uTime * vec2(0.09, 0.05)) + 0.5 * vnoise(p * 2.7 - uTime * vec2(0.07, 0.11)) + 0.25 * vnoise(p * 6.1 + uTime * 0.2);
}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
{
  // murk: slightly lighter, greener shallows read as depth variation
  float murk = vnoise(vWPos.xz * 0.05) * 0.5 + vnoise(vWPos.xz * 0.31) * 0.5;
  diffuseColor.rgb *= 0.75 + 0.5 * murk;
}`,
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.06, 0.3, smoothstep(40.0, 1200.0, length(vWPos - cameraPosition)));')
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
{
  float dist = length(vWPos - cameraPosition);
  float k = 0.42 * (1.0 - smoothstep(30.0, 500.0, dist)) + 0.02;
  vec2 p = vWPos.xz * 0.55;
  float e = 0.12;
  float hx = waterH(p + vec2(e, 0.0)) - waterH(p - vec2(e, 0.0));
  float hz = waterH(p + vec2(0.0, e)) - waterH(p - vec2(0.0, e));
  vec3 wN = normalize(vec3(-hx * k, 1.0, -hz * k));
  normal = normalize((viewMatrix * vec4(wN, 0.0)).xyz);
}`,
      );
  };
  mat.customProgramCacheKey = () => 'belfort-water-' + (emissive ? 'dark' : 'plain');
  return mat;
}
