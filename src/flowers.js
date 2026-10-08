import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import scannedFlowerUrl from './assets/lycoris-scan.glb?url&inline';

const TAU = Math.PI * 2;

function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };
}

function windMaterial(material, uniforms) {
  material.defaultAttributeValues = { ...material.defaultAttributeValues, flowerWindWeight: [0] };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFlowerTime = uniforms.time;
    shader.uniforms.uFlowerWind = uniforms.wind;
    shader.vertexShader = `uniform float uFlowerTime;\nuniform float uFlowerWind;\nattribute float flowerWindWeight;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vec3 flowerAnchor = modelMatrix[3].xyz;
      #ifdef USE_INSTANCING
        flowerAnchor += instanceMatrix[3].xyz;
      #endif
      float bend = pow(clamp(position.y / 3.9, 0.0, 1.0), 2.0) * flowerWindWeight;
      float phase = flowerAnchor.x * 0.53 + flowerAnchor.z * 0.29;
      transformed.x += sin(uFlowerTime * 0.67 + phase) * bend * 0.043 * uFlowerWind;
      transformed.z += cos(uFlowerTime * 0.51 + phase * 1.4) * bend * 0.024 * uFlowerWind;
    `);
  };
  material.customProgramCacheKey = () => 'lycoris-scan-wind-v1';
  return material;
}

/** CC0 specimen scan, with three geometric LODs sharing one photographic atlas. */
export async function createFlowerField(scene, { mobile = false, anisotropy = 4 } = {}) {
  const asset = await new GLTFLoader().loadAsync(scannedFlowerUrl);
  const meshes = [];
  asset.scene.traverse((object) => { if (object.isMesh) meshes.push(object); });
  meshes.sort((a, b) => b.geometry.index.count - a.geometry.index.count);
  if (meshes.length !== 3) throw new Error('Flower asset must contain three geometric LODs');
  const [hero, near, distant] = meshes.map((mesh) => mesh.geometry);
  for (const geometry of [hero, near, distant]) {
    geometry.setAttribute('flowerWindWeight', new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count).fill(1), 1));
  }
  const atlas = meshes[0].material.map;
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.anisotropy = anisotropy;

  const uniforms = { time: { value: 0 }, wind: { value: 1 } };
  // The atlas includes specimen lighting; a small fill preserves its fine dark filaments.
  const material = windMaterial(new THREE.MeshStandardMaterial({
    map: atlas, color: '#ffffff', roughness: .84, metalness: 0,
    emissiveMap: atlas, emissive: '#ffffff', emissiveIntensity: .16,
    side: THREE.DoubleSide,
  }), uniforms);
  const sourceMaterials = new Set(meshes.map((mesh) => mesh.material));
  sourceMaterials.forEach((source) => source.dispose());
  const depthMaterial = windMaterial(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide }), uniforms);

  const fieldGroup = new THREE.Group();
  fieldGroup.name = 'Scanned Lycoris radiata garden';
  const heroGroup = new THREE.Group();
  heroGroup.name = 'Foreground botanical scans';
  fieldGroup.add(heroGroup);
  scene.add(fieldGroup);

  const random = seededRandom(4287);
  const dummy = new THREE.Object3D();
  const counts = mobile ? [12, 42] : [22, 76];
  const instances = [];
  [near, distant].forEach((geometry, batch) => {
    const count = counts[batch];
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.name = batch === 0 ? 'Near specimen scans' : 'Distant specimen scans';
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.customDepthMaterial = depthMaterial;
    fieldGroup.add(mesh);
    instances.push(mesh);
    for (let i = 0; i < count; i += 1) {
      const side = random() > .5 ? 1 : -1;
      let x, z, scale;
      if (batch === 0 && i < (mobile ? 3 : 6)) {
        x = side * (7.2 + random() * 3.3);
        z = 3.4 + random() * 2.8;
        scale = .47 + random() * .18;
      } else if (batch === 0) {
        x = side * (3.2 + random() * 9);
        z = -3.6 - random() * 11.6;
        scale = .45 + random() * .19;
      } else {
        x = side * (2.9 + random() * 14);
        z = -10.8 - random() * 21.6;
        scale = .39 + random() * .22;
      }
      dummy.position.set(x, -.025, z);
      dummy.rotation.set((random() - .5) * .07, random() * TAU, (random() - .5) * .07);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      const tint = .86 + random() * .14;
      mesh.setColorAt(i, new THREE.Color(tint, tint * (.96 + random() * .04), tint * .97));
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  });

  heroGroup.position.x = mobile ? -1 : 0;
  const placements = [[3.8, 2, 1.17, .4], [6.3, -1, .94, 2.6], [2.75, -3.4, .79, 4.8]];
  placements.forEach(([x, z, scale, yaw], index) => {
    const plant = new THREE.Mesh(index === 0 ? hero : near, material);
    plant.name = `Scanned specimen ${index + 1}`;
    plant.position.set(x, -.025, z);
    plant.scale.setScalar(scale);
    plant.rotation.set(index === 0 ? -.03 : .04, yaw, index === 0 ? -.035 : .04);
    plant.castShadow = true;
    plant.receiveShadow = false;
    plant.customDepthMaterial = depthMaterial;
    heroGroup.add(plant);
  });

  return {
    heroGroup,
    configureDepthMaterial(depth) {
      depth.side = THREE.DoubleSide;
      windMaterial(depth, uniforms);
    },
    setPalette(mode) {
      material.color.set({ moon: '#fff9f5', ember: '#ffe8d3', mist: '#eff5f0' }[mode] || '#fff9f5');
    },
    update(time, wind = 1) {
      uniforms.time.value = time;
      uniforms.wind.value = THREE.MathUtils.clamp(wind, 0, 3);
    },
    dispose() {
      scene.remove(fieldGroup);
      instances.forEach((mesh) => mesh.dispose());
      [hero, near, distant].forEach((geometry) => geometry.dispose());
      atlas.dispose();
      material.dispose();
      depthMaterial.dispose();
    },
  };
}
