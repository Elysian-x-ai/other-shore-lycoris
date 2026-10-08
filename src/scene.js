import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Water } from 'three/addons/objects/Water.js';
import { createFlowerField } from './flowers.js';
import moonTextureUrl from './assets/moon.jpg';
import waterNormalsUrl from './assets/waternormals.jpg';
import groundTextureUrl from './assets/ground.jpg';

const palettes = {
  moon: { sky: '#101e20', fog: '#243b38', water: '#081a19', moon: '#f7efd5', key: '#fae7d1', fill: '#aabfc1', density: .024, exposure: 1.05 },
  ember: { sky: '#241c21', fog: '#453132', water: '#1b161a', moon: '#ffcc8f', key: '#ffcfab', fill: '#ca7b6a', density: .027, exposure: 1.08 },
  mist: { sky: '#253c3a', fog: '#4b6660', water: '#1e3734', moon: '#f3f3e1', key: '#e1f7e6', fill: '#bbc7c1', density: .042, exposure: 1.1 },
};

function seededRandom(seed = 1459) {
  return () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
}

export async function createScene(container) {
  const mobile = matchMedia('(max-width: 760px)').matches;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.info.autoReset = false;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palettes.moon.sky);
  scene.fog = new THREE.FogExp2(palettes.moon.fog, .013);
  const camera = new THREE.PerspectiveCamera(46, container.clientWidth / container.clientHeight, .1, 230);
  const ambient = new THREE.HemisphereLight('#bfd4c1', '#0a100e', .95);
  scene.add(ambient);
  const moonlight = new THREE.DirectionalLight('#fff1d2', 1.65);
  moonlight.position.set(-2, 13, 5);
  moonlight.target.position.set(3, 2, 0);
  moonlight.castShadow = true;
  moonlight.shadow.mapSize.set(1024, 1024);
  Object.assign(moonlight.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: .5, far: 30 });
  moonlight.shadow.normalBias = .006;
  moonlight.shadow.bias = -.0001;
  scene.add(moonlight.target);
  scene.add(moonlight);
  const rim = new THREE.DirectionalLight('#aabfc1', .8);
  rim.position.set(8, 6, -8);
  scene.add(rim);
  const front = new THREE.DirectionalLight('#dfedcf', .65);
  front.position.set(-8, 3, 10);
  scene.add(front);
  const flowerAccent = new THREE.PointLight('#ffe0ca', 22, 10, 2);
  flowerAccent.position.set(mobile ? 1.6 : 2.6, 6.8, 5.5);
  scene.add(flowerAccent);
  const flowerRim = new THREE.PointLight('#bdcdd5', 11, 7, 2);
  flowerRim.position.set(mobile ? 4.4 : 5.4, 5.5, -.3);
  scene.add(flowerRim);

  const loader = new THREE.TextureLoader();
  const [moonMap, waterMap, groundMap] = await Promise.all([
    loader.loadAsync(moonTextureUrl),
    loader.loadAsync(waterNormalsUrl),
    loader.loadAsync(groundTextureUrl),
  ]);
  moonMap.colorSpace = THREE.SRGBColorSpace;
  waterMap.wrapS = waterMap.wrapT = THREE.RepeatWrapping;
  groundMap.colorSpace = THREE.SRGBColorSpace;
  groundMap.wrapS = groundMap.wrapT = THREE.RepeatWrapping;
  groundMap.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const moon = new THREE.Mesh(new THREE.SphereGeometry(4.5, 64, 40), new THREE.MeshBasicMaterial({ map: moonMap, color: '#f7efd5', fog: false }));
  moon.material.color.multiplyScalar(1.3);
  moon.position.set(1, 13.5, -46);
  moon.rotation.set(.24, -1.5, .1);
  scene.add(moon);

  const starsGeometry = new THREE.BufferGeometry();
  const random = seededRandom();
  const starPositions = [];
  const starColors = [];
  for (let i = 0; i < 420; i++) {
    starPositions.push((random() - .5) * 220, 10 + random() * 85, -85 - random() * 45);
    const c = .32 + random() * .42;
    starColors.push(c * .88, c, c * .91);
  }
  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
  const stars = new THREE.Points(starsGeometry, new THREE.PointsMaterial({ size: .075, vertexColors: true, transparent: true, opacity: .8, fog: false }));
  scene.add(stars);

  // Layered ridgelines establish distance without flattening the flower silhouettes.
  for (let layer = 0; layer < 3; layer++) {
    const vertices = [];
    const z = -52 - layer * 23;
    for (let i = 0; i < 241; i++) {
      const x = -120 + i;
      const height = 2 + Math.sin(i * .07 + layer * 3) * 2.8 + Math.sin(i * .17 + layer) * .7 + Math.sin(i * .53) * .13;
      vertices.push(x, -5, z, x, height + layer * 2, z);
    }
    const indices = [];
    for (let i = 0; i < 240; i++) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    scene.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: ['#102422', '#253d38', '#30453f'][layer], side: THREE.DoubleSide })));
  }

  const water = new Water(new THREE.PlaneGeometry(180, 200), {
    textureWidth: mobile ? 512 : 1024,
    textureHeight: mobile ? 512 : 1024,
    waterNormals: waterMap,
    sunDirection: new THREE.Vector3(-.2, .8, -.55).normalize(),
    sunColor: '#b3bdae',
    waterColor: '#081a19',
    distortionScale: 2.8,
    fog: true,
  });
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -.12, -45);
  // The depth pass needs the water surface, but not another reflection render.
  const renderWaterReflection = water.onBeforeRender;
  water.onBeforeRender = function (...args) {
    if (!scene.overrideMaterial) renderWaterReflection.apply(this, args);
  };
  scene.add(water);

  const groundMaterial = new THREE.MeshStandardMaterial({ map: groundMap, color: '#687468', roughness: .98, metalness: 0 });
  for (const side of [-1, 1]) {
    const positions = [], indices = [], uvs = [];
    for (let i = 0; i <= 65; i++) {
      const z = 12 - i * 1.15;
      const edge = 2.0 + Math.sin(z * .115) * .8 + Math.sin(z * .37) * .14;
      positions.push(side * edge, -.045 + random() * .025, z, side * 60, -.025, z);
      uvs.push(side * edge / 3, z / 3, side * 60 / 3, z / 3);
    }
    for (let i = 0; i < 65; i++) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const material = groundMaterial.clone();
    material.side = THREE.DoubleSide;
    const bank = new THREE.Mesh(geometry, material);
    bank.receiveShadow = true;
    scene.add(bank);
  }

  const rockGeometry = new THREE.DodecahedronGeometry(1, 2);
  const rocks = new THREE.InstancedMesh(rockGeometry, new THREE.MeshStandardMaterial({ color: '#13201c', roughness: .33, metalness: .26 }), 54);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 54; i++) {
    const side = i % 2 ? 1 : -1;
    const z = 10 - random() * 65;
    const edge = 2.15 + Math.sin(z * .115) * .8;
    dummy.position.set(side * (edge + random() * 7), -.15, z);
    dummy.scale.set(.07 + random() * .22, .06 + random() * .065, .1 + random() * .2);
    dummy.rotation.set(random() * .4, random() * 6.28, random() * .3);
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
  }
  scene.add(rocks);

  const flowers = await createFlowerField(scene, { mobile, anisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy()) });

  // Low clouds use world-space noise so parallax and reflection share their depth.
  const mistMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#9bb9a1') }, uOpacity: { value: .11 } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `
      varying vec2 vUv; uniform float uTime; uniform vec3 uColor; uniform float uOpacity;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
      void main(){vec2 p=vUv*vec2(10.,3.);p.x+=uTime*.025;float n=noise(p)*.65+noise(p*2.1)*.35;float e=sin(vUv.x*3.14159)*pow(sin(vUv.y*3.14159),2.);float a=smoothstep(.25,.78,n)*e*uOpacity;gl_FragColor=vec4(uColor,a);}
    `,
  });
  const mistSheets = [];
  for (let i = 0; i < 5; i++) {
    const mist = new THREE.Mesh(new THREE.PlaneGeometry(75, 5.5), mistMaterial);
    mist.position.set(i % 2 ? -7 : 6, 1.4 + i * .25, -7 - i * 10);
    scene.add(mist);
    mistSheets.push(mist);
  }

  const petalShape = new THREE.Shape();
  petalShape.moveTo(0, 0);
  petalShape.bezierCurveTo(.065, .09, .07, .29, 0, .4);
  petalShape.bezierCurveTo(-.025, .28, -.052, .13, 0, 0);
  const driftingPetals = new THREE.InstancedMesh(new THREE.ShapeGeometry(petalShape), new THREE.MeshStandardMaterial({ color: '#c83d47', emissive: '#4b0a13', emissiveIntensity: .3, side: THREE.DoubleSide, roughness: .68 }), mobile ? 18 : 36);
  const petalData = Array.from({ length: driftingPetals.count }, () => ({ x: (random() - .5) * 26, y: random() * 13, z: random() * 22 - 12, speed: .18 + random() * .25, phase: random() * 6.28 }));
  scene.add(driftingPetals);

  const renderTarget = new THREE.WebGLRenderTarget(container.clientWidth, container.clientHeight, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, renderTarget);
  composer.addPass(new RenderPass(scene, camera));
  const bokeh = new BokehPass(scene, camera, { focus: mobile ? 13.5 : 10.8, aperture: .000075, maxblur: .007 });
  flowers.configureDepthMaterial(bokeh._materialDepth);
  const renderBokeh = bokeh.render;
  bokeh.render = function (...args) {
    const autoUpdate = renderer.shadowMap.autoUpdate;
    const visible = mistSheets.map((mist) => mist.visible);
    renderer.shadowMap.autoUpdate = false;
    // Transparent mist must not become an opaque plane in the depth override.
    mistSheets.forEach((mist) => { mist.visible = false; });
    try { renderBokeh.apply(this, args); }
    finally {
      renderer.shadowMap.autoUpdate = autoUpdate;
      mistSheets.forEach((mist, index) => { mist.visible = visible[index]; });
    }
  };
  composer.addPass(bokeh);
  const bloom = new UnrealBloomPass(new THREE.Vector2(container.clientWidth, container.clientHeight), .24, .55, .82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let mode = 'moon', paused = reducedMotion.matches, immersed = false, time = 0, frames = 0;
  let cameraProgress = 0, previousTime = performance.now(), active = true;
  const pointer = new THREE.Vector2(), smoothedPointer = new THREE.Vector2();
  const targetColors = { sky: new THREE.Color(), fog: new THREE.Color(), water: new THREE.Color(), moon: new THREE.Color(), key: new THREE.Color(), fill: new THREE.Color() };
  const lookTarget = new THREE.Vector3();
  const flowerFocus = new THREE.Vector3();
  let eventPoint = null;

  function setMode(nextMode) {
    if (!palettes[nextMode]) return;
    mode = nextMode;
    flowers.setPalette(mode);
  }

  function resize() {
    const width = container.clientWidth, height = container.clientHeight;
    renderer.setSize(width, height);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.fov = width <= 760 ? 53 : 46;
    camera.updateProjectionMatrix();
    moon.position.x = width <= 760 ? 10 : 1;
    moon.position.y = width <= 760 ? 21 : 13.5;
    moon.scale.setScalar(width <= 760 ? .72 : 1);
  }
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(container);

  function onPointerMove(event) {
    if (event.pointerType === 'touch' && !eventPoint) return;
    pointer.x = (event.clientX / container.clientWidth - .5) * 2;
    pointer.y = (event.clientY / container.clientHeight - .5) * 2;
  }
  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerdown', (event) => { eventPoint = [event.clientX, event.clientY]; });
  window.addEventListener('pointerup', () => { eventPoint = null; });
  container.addEventListener('pointerleave', () => pointer.set(0, 0));

  function frame(now) {
    if (!active) return;
    requestAnimationFrame(frame);
    const delta = Math.min((now - previousTime) / 1000, .05);
    previousTime = now;
    if (document.hidden) return;
    if (!paused) time += delta;
    frames++;
    const ease = reducedMotion.matches ? 1 : 1 - Math.exp(-delta * 2);
    cameraProgress += ((immersed ? 1 : 0) - cameraProgress) * ease;
    smoothedPointer.lerp(paused ? new THREE.Vector2() : pointer, .028);
    const smallScreen = container.clientWidth <= 760;
    const baseX = smallScreen ? 1.3 : 0;
    const baseY = smallScreen ? 4.6 : 4.4;
    const baseZ = smallScreen ? 15.6 : 13;
    camera.position.set(baseX + smoothedPointer.x * .4 + cameraProgress * 1.15, baseY - smoothedPointer.y * .19 - cameraProgress * .5, baseZ - cameraProgress * 3.3);
    lookTarget.set((smallScreen ? 1.6 : 0) + cameraProgress * (smallScreen ? 1.2 : 3.8), (smallScreen ? 3 : 2.4) + cameraProgress * (smallScreen ? .3 : .9), -4 + cameraProgress * 6);
    camera.lookAt(lookTarget);
    camera.updateMatrixWorld();
    flowerFocus.set(smallScreen ? 2.8 : 3.8, 4, 2).applyMatrix4(camera.matrixWorldInverse);
    bokeh.uniforms.focus.value = -flowerFocus.z;
    const palette = palettes[mode];
    for (const key of Object.keys(targetColors)) targetColors[key].set(palette[key]);
    scene.background.lerp(targetColors.sky, ease * .65);
    scene.fog.color.lerp(targetColors.fog, ease * .65);
    scene.fog.density += (palette.density - scene.fog.density) * ease;
    renderer.toneMappingExposure += (palette.exposure - renderer.toneMappingExposure) * ease;
    moon.material.color.lerp(targetColors.moon.clone().multiplyScalar(1.3), ease);
    moonlight.color.lerp(targetColors.key, ease);
    rim.color.lerp(targetColors.fill, ease);
    flowerAccent.color.lerp(targetColors.key, ease);
    flowerRim.color.lerp(targetColors.fill, ease * .5);
    water.material.uniforms.waterColor.value.lerp(targetColors.water, ease);
    water.material.uniforms.sunColor.value.lerp(targetColors.moon, ease);
    water.material.uniforms.time.value = time * .42;
    mistMaterial.uniforms.uTime.value = time;
    mistMaterial.uniforms.uOpacity.value += ((mode === 'mist' ? .27 : .11) - mistMaterial.uniforms.uOpacity.value) * ease;
    stars.material.opacity += ((mode === 'mist' ? .25 : .8) - stars.material.opacity) * ease;
    flowers.update(time, mode === 'ember' ? 1.2 : .75);
    for (let i = 0; i < petalData.length; i++) {
      const p = petalData[i];
      dummy.position.set(p.x + Math.sin(time * .17 + p.phase) * 2.5, ((p.y - time * p.speed) % 13 + 13) % 13, p.z + Math.sin(time * .12 + p.phase) * 1.4);
      dummy.rotation.set(time * .4 + p.phase, time * .21 + p.phase, Math.sin(time * .24 + p.phase));
      dummy.scale.setScalar(.65 + (i % 4) * .18);
      dummy.updateMatrix();
      driftingPetals.setMatrixAt(i, dummy.matrix);
    }
    driftingPetals.instanceMatrix.needsUpdate = true;
    renderer.info.reset();
    composer.render();
  }
  requestAnimationFrame(frame);
  return {
    setMode,
    setPaused(value) { paused = value; },
    setImmersed(value) { immersed = value; },
    get paused() { return paused; },
    capture() { return new Promise((resolve) => { composer.render(); renderer.domElement.toBlob(resolve, 'image/png'); }); },
    diagnostics() { return { frames, time, paused, mode, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, camera: camera.position.toArray(), size: { width: renderer.domElement.width, height: renderer.domElement.height } }; },
    dispose() { active = false; observer.disconnect(); flowers.dispose(); bokeh.dispose(); composer.dispose(); renderer.dispose(); },
  };
}
