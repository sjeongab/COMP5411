// main.js
import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';

import { addObjects } from './object/addObjects.js';
import { addSkyBox } from './object/addSkyBox.js';

import { gBuffer } from './gBuffer/gBuffer.js';
import { loadSSRMaterial } from './ssr/ssrBuffer.js';
import { loadRaytracingMaterial } from './raytracing/raytracingBuffer.js';

const canvas = document.getElementById('canvas');

// -------- حالت‌ها --------
let mode = 'Plain';       // 'Plain' | 'SSR' | 'Hybrid' (Ray Tracing)
let phongMode = 'Phong';  // 'Phong' | 'NoPhong'

// -------- Renderer --------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

if ('outputColorSpace' in renderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
} else if ('outputEncoding' in renderer) {
  renderer.outputEncoding = THREE.sRGBEncoding;
}
renderer.autoClear = false;

// -------- Scene & Camera --------
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  1,
  500
);
camera.position.set(0, 75, 160);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.maxDistance = 400;
controls.minDistance = 10;
controls.update();

// -------- Lights / Objects / Skybox --------
scene.add(new THREE.AmbientLight(0x404040));

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

addObjects(scene);
addSkyBox(renderer, scene);

// -------- Post-process scenes --------
let ssrScene = null;
let ssrCamera = null;
let ssrQuad = null;
let ssrMaterial = null;

let rtScene = null;
let rtCamera = null;
let rtQuad = null;
let raytracingMaterial = null;

// -------- Mode dropdown --------
const modeSelect = document.getElementById('modeSelect');
if (modeSelect && modeSelect.value) {
  mode = modeSelect.value;
}
if (modeSelect) {
  modeSelect.addEventListener('change', (e) => {
    mode = e.target.value;
    setupMode();
  });
}

// -------- Phong dropdown --------
const phongSelect = document.createElement('select');
phongSelect.style.position = 'absolute';
phongSelect.style.top = '40px';
phongSelect.style.right = '10px';
phongSelect.style.padding = '5px';
phongSelect.style.zIndex = 10;
phongSelect.innerHTML = `
  <option value="Phong" selected>Phong On</option>
  <option value="NoPhong">Phong Off</option>
`;
document.body.appendChild(phongSelect);

phongSelect.addEventListener('change', () => {
  phongMode = phongSelect.value;
  const v = phongMode === 'Phong' ? 1 : 0;

  if (ssrMaterial && ssrMaterial.uniforms.phongMode) {
    ssrMaterial.uniforms.phongMode.value = v;
  }
  if (raytracingMaterial && raytracingMaterial.uniforms.phongMode) {
    raytracingMaterial.uniforms.phongMode.value = v;
  }
});

// -------- Helpers --------
function clearPost() {
  ssrScene = ssrCamera = ssrQuad = ssrMaterial = null;
  rtScene = rtCamera = rtQuad = raytracingMaterial = null;
}

function setupMode() {
  clearPost();

  if (mode === 'SSR') {
    // Fullscreen SSR
    ssrScene = new THREE.Scene();
    ssrCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    ssrMaterial = loadSSRMaterial(ssrCamera);
    if (ssrMaterial.uniforms.phongMode) {
      ssrMaterial.uniforms.phongMode.value = (phongMode === 'Phong') ? 1 : 0;
    }

    ssrQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ssrMaterial);
    ssrQuad.frustumCulled = false;
    ssrScene.add(ssrQuad);

  } else if (mode === 'Hybrid') {
    // Fullscreen Ray Tracing
    rtScene = new THREE.Scene();
    rtCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    raytracingMaterial = loadRaytracingMaterial();
    raytracingMaterial.uniforms.phongMode.value =
      (phongMode === 'Phong') ? 1 : 0;

    rtQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), raytracingMaterial);
    rtQuad.frustumCulled = false;
    rtScene.add(rtQuad);

  } else {
    // Plain
  }
}

// -------- Render Loop --------
function animate() {
  requestAnimationFrame(animate);

  controls.update();
  camera.updateMatrixWorld(true);

  renderer.setRenderTarget(null);
  renderer.clear(true, true, true);

  // ---- Plain ----
  if (mode === 'Plain') {
    renderer.render(scene, camera);
    return;
  }

  // ---- SSR ----
  if (mode === 'SSR' && ssrScene && ssrMaterial) {
    // 1) صحنه اصلی → gBuffer
    renderer.setRenderTarget(gBuffer);
    renderer.clear(true, true, true);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);

    // 2) آپدیت یونیفرم‌ها بر اساس دوربین اصلی
    const viewMatrix = new THREE.Matrix4()
      .copy(camera.matrixWorld)
      .invert(); // V
    const projMatrix = camera.projectionMatrix; // P

    const invProjMatrix = new THREE.Matrix4()
      .copy(projMatrix)
      .invert();
    const invViewMatrix = new THREE.Matrix4()
      .copy(viewMatrix)
      .invert(); // world-from-view

    if (ssrMaterial.uniforms.projectionMatrix) {
      ssrMaterial.uniforms.projectionMatrix.value.copy(projMatrix);
    }
    if (ssrMaterial.uniforms.inverseProjectionMatrix) {
      ssrMaterial.uniforms.inverseProjectionMatrix.value.copy(invProjMatrix);
    }
    if (ssrMaterial.uniforms.inverseViewMatrix) {
      ssrMaterial.uniforms.inverseViewMatrix.value.copy(invViewMatrix);
    }
    if (ssrMaterial.uniforms.cameraWorldPosition) {
      ssrMaterial.uniforms.cameraWorldPosition.value.copy(camera.position);
    }
    if (ssrMaterial.uniforms.cameraNear !== undefined) {
      ssrMaterial.uniforms.cameraNear.value = camera.near;
    }
    if (ssrMaterial.uniforms.cameraFar !== undefined) {
      ssrMaterial.uniforms.cameraFar.value = camera.far;
    }
    if (ssrMaterial.uniforms.resolution) {
      ssrMaterial.uniforms.resolution.value.set(
        window.innerWidth,
        window.innerHeight
      );
    }
    if (ssrMaterial.uniforms.phongMode) {
      ssrMaterial.uniforms.phongMode.value =
        (phongMode === 'Phong') ? 1 : 0;
    }

    renderer.render(ssrScene, ssrCamera);
    return;
  }

  // ---- Hybrid (Ray Tracing) ----
  if (mode === 'Hybrid' && rtScene && raytracingMaterial) {
    // اینجا فیکس اصلی:
    // چون با camera رندر نمی‌کنیم، matrixWorldInverse آپدیت نمی‌شه
    // پس خودمون V را از matrixWorld حساب می‌کنیم
    const viewMatrix = new THREE.Matrix4()
      .copy(camera.matrixWorld)
      .invert();      // V
    const projMatrix = camera.projectionMatrix;          // P

    const viewProj = new THREE.Matrix4().multiplyMatrices(
      projMatrix,
      viewMatrix
    );                                                   // P * V

    const invViewProj = new THREE.Matrix4()
      .copy(viewProj)
      .invert();                                        // (P*V)^-1

    raytracingMaterial.uniforms.invViewProj.value.copy(invViewProj);
    raytracingMaterial.uniforms.cameraPos.value.copy(camera.position);

    if (raytracingMaterial.uniforms.resolution) {
      raytracingMaterial.uniforms.resolution.value.set(
        window.innerWidth,
        window.innerHeight
      );
    }
    if (raytracingMaterial.uniforms.phongMode) {
      raytracingMaterial.uniforms.phongMode.value =
        (phongMode === 'Phong') ? 1 : 0;
    }

    renderer.render(rtScene, rtCamera);
    return;
  }

  // fallback
  renderer.render(scene, camera);
}

// -------- Resize --------
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);

  if (ssrMaterial && ssrMaterial.uniforms.resolution) {
    ssrMaterial.uniforms.resolution.value.set(w, h);
  }
  if (raytracingMaterial && raytracingMaterial.uniforms.resolution) {
    raytracingMaterial.uniforms.resolution.value.set(w, h);
  }
});

// -------- Start --------
setupMode();
animate();
