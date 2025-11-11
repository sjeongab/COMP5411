// main.js
import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';

import { addObjects } from './object/addObjects.js';
import { addSkyBox } from './object/addSkyBox.js';

// Plain mode reflective plane
import { createReflectivePlane } from './plane/planeBuffer.js';

// SSR / Hybrid (adjust paths according to your project)
import { loadSSRMaterial, gBuffer } from './ssr/ssrBuffer.js';
import { loadRaytracingMaterial } from './raytracing/raytracingBuffer.js';

// ---------- Canvas ----------
const canvas =
  document.getElementById('canvas') || document.createElement('canvas');
if (!canvas.parentElement) document.body.appendChild(canvas);

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.autoClear = false;

if ('outputColorSpace' in renderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
} else if ('outputEncoding' in renderer) {
  renderer.outputEncoding = THREE.sRGBEncoding;
}

// ---------- Scene & Camera ----------
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  1,
  500
);
camera.position.set(0, 75, 160);

// ---------- OrbitControls ----------
const cameraControls = new OrbitControls(camera, renderer.domElement);
cameraControls.target.set(0, 0, 0);
cameraControls.maxDistance = 400;
cameraControls.minDistance = 10;
cameraControls.enableDamping = true;
cameraControls.dampingFactor = 0.25;
cameraControls.enableZoom = true;
cameraControls.update();

// ---------- Lights ----------
scene.add(new THREE.AmbientLight(0x404040));

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// ---------- Scene Content ----------
addObjects(scene);
addSkyBox(renderer, scene);

// ---------- Reflective Plane (Plain mode only) ----------
let reflectivePlane = null;
let reflectivePlaneMaterial = null;

{
  const { mesh, material } = createReflectivePlane(scene);

  // Raise it a bit so if an old ground exists, it doesn't go under it
  mesh.position.y += 0.01;

  // If you have an old ground, you can hide it here (optional)
  //   scene.traverse((obj) => {
  //     if (obj.isMesh && obj.userData && obj.userData.isOldGround) {
  //       obj.visible = false;
  //     }
  //   });

  reflectivePlane = mesh;
  reflectivePlaneMaterial = material;
  scene.add(reflectivePlane);
}

// ---------- State ----------
let mode = 'Plain';       // 'Plain' | 'SSR' | 'Hybrid'
let phongMode = 'Phong';  // 'Phong' | 'NoPhong'

// ---------- Post-process Pipelines ----------
// SSR
let ssrScene = null;
let ssrCamera = null;
let ssrQuad = null;
let ssrMaterial = null;

// Hybrid full-screen RT
let rtScene = null;
let rtCamera = null;
let rtQuad = null;
let raytracingMaterial = null;

// ---------- Mode Select ----------
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

// ---------- Phong Select ----------
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

// ---------- Helpers ----------
function clearPost() {
  ssrScene = ssrCamera = ssrQuad = ssrMaterial = null;
  rtScene = rtCamera = rtQuad = raytracingMaterial = null;
  // Keep reflectivePlane; only visibility is controlled in setupMode
}

function setupMode() {
  clearPost();

  // Reflective plane should only be visible in Plain mode
  if (reflectivePlane) {
    reflectivePlane.visible = (mode === 'Plain');
  }

  // ----- SSR Mode -----
  if (mode === 'SSR') {
    ssrScene = new THREE.Scene();
    ssrCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    ssrMaterial = loadSSRMaterial(ssrCamera);
    if (ssrMaterial.uniforms.phongMode) {
      ssrMaterial.uniforms.phongMode.value =
        (phongMode === 'Phong') ? 1 : 0;
    }

    ssrQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      ssrMaterial
    );
    ssrQuad.frustumCulled = false;
    ssrScene.add(ssrQuad);
  }

  // ----- Hybrid Mode -----
  else if (mode === 'Hybrid') {
    rtScene = new THREE.Scene();
    rtCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    raytracingMaterial = loadRaytracingMaterial();
    if (raytracingMaterial.uniforms.phongMode) {
      raytracingMaterial.uniforms.phongMode.value =
        (phongMode === 'Phong') ? 1 : 0;
    }

    rtQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      raytracingMaterial
    );
    rtQuad.frustumCulled = false;
    rtScene.add(rtQuad);
  }

  // Plain: we don't add anything; only reflectivePlane is active in the scene
}

// ---------- Render Loop ----------
function animate() {
  requestAnimationFrame(animate);

  cameraControls.update();
  camera.updateMatrixWorld(true);

  renderer.setRenderTarget(null);
  renderer.clear(true, true, true);

  // ----- Plain (Scene + Reflective Plane Shader) -----
  if (mode === 'Plain') {
    if (reflectivePlaneMaterial) {
      // Update camera position for the plane shader
      if (reflectivePlaneMaterial.uniforms.cameraPos) {
        reflectivePlaneMaterial.uniforms.cameraPos.value.copy(camera.position);
      }
      // If you use light in planeFragmentShader:
      if (reflectivePlaneMaterial.uniforms.lightDir) {
        reflectivePlaneMaterial.uniforms.lightDir.value
          .set(5, 10, 7)
          .normalize();
      }
    }

    renderer.render(scene, camera);
    return;
  }

  // ----- SSR -----
  if (mode === 'SSR' && ssrScene && ssrMaterial) {
    renderer.setRenderTarget(gBuffer);
    renderer.clear(true, true, true);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);

    const viewMatrix = camera.matrixWorldInverse.clone();
    const projMatrix = camera.projectionMatrix.clone();
    const invProjMatrix = projMatrix.clone().invert();
    const invViewMatrix = viewMatrix.clone().invert();

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

    renderer.render(scene, camera);
    renderer.render(ssrScene, ssrCamera);
    return;
  }

  // ----- Hybrid (Full-screen Ray Tracing) -----
  if (mode === 'Hybrid' && rtScene && raytracingMaterial) {
    const viewMatrix = camera.matrixWorldInverse.clone();
    const projMatrix = camera.projectionMatrix.clone();
    const viewProj = new THREE.Matrix4().multiplyMatrices(
      projMatrix,
      viewMatrix
    );
    const invViewProj = viewProj.clone().invert();

    raytracingMaterial.uniforms.invViewProj.value.copy(invViewProj);
    raytracingMaterial.uniforms.cameraPos.value.copy(camera.position);
    if (raytracingMaterial.uniforms.resolution) {
      raytracingMaterial.uniforms.resolution.value.set(
        window.innerWidth,
        window.innerHeight
      );
    }

    renderer.render(rtScene, rtCamera);
    return;
  }

  // ----- Fallback -----
  renderer.render(scene, camera);
}

// ---------- Resize ----------
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

// ---------- Start ----------
setupMode();
animate();
