// main.js
import { addObjects, addLightMarker } from './object/addObjects.js'
import * as THREE from 'three'
import { OrbitControls } from 'OrbitControls'
import { ssrBuffer, ssrBufferMaterial } from './ssr/ssrBuffer.js'
import { gBuffer, gBufferMaterial } from './gBuffer/gBuffer.js'

// --- Canvas (اگه <canvas> نداری) ---
const canvas = document.querySelector('canvas') || document.createElement('canvas')

// --- State ---
let cameraControls;
let rotationSpeed = 0.01;
let mouseDown = false;
let mouseX = 0;
let mouseY = 0;
let autoRotateEnabled = false;
let rotatableObjects = [];

const MODE = 'scene'

// --- Scene/Camera/Renderer ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x4422bb); // پس‌زمینهٔ بنفش فعلی
const ssrScene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
camera.position.set(0, 75, 160);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Controls ---
cameraControls = new OrbitControls(camera, renderer.domElement);
cameraControls.target.set(0, 0, 0);
cameraControls.maxDistance = 400;
cameraControls.minDistance = 10;
cameraControls.enableDamping = true;
cameraControls.dampingFactor = 0.05;
cameraControls.update();

// --- Plane بازتاب‌پذیر (اول اضافه شود) ---
const planeGeometry = new THREE.PlaneGeometry(150, 150);
const plane = new THREE.Mesh(planeGeometry, gBufferMaterial.clone());
plane.rotateX(-Math.PI / 2);
plane.material.uniforms.uReflectivity.value = 0.8;
plane.material.uniforms.uColor.value = new THREE.Color(0x333333); // تیره برای تمایز
plane.userData.isInteractive = false;
scene.add(plane);

// --- آبجکت‌ها ---
addObjects(scene);

// --- نورها ---
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

// نور اصلی که می‌خوای مکانش رو ببینی
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// یک نور کمکی
const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1);
directionalLight2.position.set(5, 10, 7);
scene.add(directionalLight2);

// --- مارکر کره‌ای سفید در مکان نور ---
const lightMarker = addLightMarker(scene, [
  directionalLight.position.x,
  directionalLight.position.y,
  directionalLight.position.z
], 3.0); // شعاع 3

// --- آماده‌سازی آبجکت‌های تعاملی (clone متریال) ---
function setupInteractiveObjects() {
  rotatableObjects = [];
  scene.traverse((child) => {
    if (child.isMesh && child.geometry && child !== plane && child.userData.isInteractive !== false) {
      child.userData.originalMaterial = child.material;

      const interactiveMaterial = gBufferMaterial.clone();
      child.material = interactiveMaterial;

      interactiveMaterial.uniforms.uColor.value        = new THREE.Color(child.userData.color || 0x8080ff);
      interactiveMaterial.uniforms.uReflectivity.value = child.userData.reflectivity ?? 0.5;
      if (interactiveMaterial.uniforms.uMetalness)  interactiveMaterial.uniforms.uMetalness.value  = child.userData.metalness  ?? 0.5;
      if (interactiveMaterial.uniforms.uRoughness) interactiveMaterial.uniforms.uRoughness.value = child.userData.roughness ?? 0.5;

      child.userData.isInteractive = true;
      rotatableObjects.push(child);
    }
  });
  console.log(`Found ${rotatableObjects.length} interactive objects`);
}
setTimeout(setupInteractiveObjects, 100);

// ❗️بعد از setup، مارکر رو دوباره قفل کن (اگر ناخواسته دست‌کاری شد)
setTimeout(() => {
  const marker = scene.getObjectByName('LightMarker');
  if (marker && marker.material && marker.material.uniforms) {
    marker.userData.isInteractive = false;
    marker.material.uniforms.uReflectivity.value = 0.0;
    marker.material.uniforms.uColor.value.set(0xffffff);
    console.log('[LightMarker] re-locked after setupInteractiveObjects()', marker.position.clone());
  } else {
    console.warn('[LightMarker] not found after setupInteractiveObjects()');
  }
}, 150);

// --- PostProcess: SSR fullscreen quad ---
const postProcessQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ssrBufferMaterial);
const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
ssrScene.add(postProcessQuad);

// --- Mouse Controls ---
renderer.domElement.addEventListener('mousedown', (event) => {
  if (!rotatableObjects.length) return;
  mouseDown = true; mouseX = event.clientX; mouseY = event.clientY; cameraControls.enabled = false;
});
renderer.domElement.addEventListener('mouseup', () => { mouseDown = false; cameraControls.enabled = true; });
renderer.domElement.addEventListener('mousemove', (event) => {
  if (!mouseDown || !rotatableObjects.length) return;
  const dx = event.clientX - mouseX, dy = event.clientY - mouseY;
  rotatableObjects.forEach((obj) => { obj.rotation.y += dx * 0.01; obj.rotation.x += dy * 0.01; });
  mouseX = event.clientX; mouseY = event.clientY;
});

// --- Touch Controls ---
renderer.domElement.addEventListener('touchstart', (event) => {
  if (!rotatableObjects.length) return;
  mouseDown = true; mouseX = event.touches[0].clientX; mouseY = event.touches[0].clientY; cameraControls.enabled = false;
}, { passive: false });
renderer.domElement.addEventListener('touchend', () => { mouseDown = false; cameraControls.enabled = true; });
renderer.domElement.addEventListener('touchmove', (event) => {
  if (!mouseDown || !rotatableObjects.length) return;
  event.preventDefault();
  const dx = event.touches[0].clientX - mouseX, dy = event.touches[0].clientY - mouseY;
  rotatableObjects.forEach(obj => { obj.rotation.y += dx * 0.01; obj.rotation.x += dy * 0.01; });
  mouseX = event.touches[0].clientX; mouseY = event.touches[0].clientY;
}, { passive: false });

// --- Keyboard Controls ---
document.addEventListener('keydown', (event) => {
  if (!rotatableObjects.length) return;
  switch (event.code) {
    case 'KeyR': autoRotateEnabled = !autoRotateEnabled; break;
    case 'ArrowLeft':  rotatableObjects.forEach(o => o.rotation.y += 0.2); break;
    case 'ArrowRight': rotatableObjects.forEach(o => o.rotation.y -= 0.2); break;
    case 'ArrowUp':    rotatableObjects.forEach(o => o.rotation.x += 0.2); break;
    case 'ArrowDown':  rotatableObjects.forEach(o => o.rotation.x -= 0.2); break;
    case 'KeyT': {
      const nv = rotatableObjects[0].material.uniforms.uReflectivity.value > 0.5 ? 0.1 : 0.8;
      rotatableObjects.forEach(o => { o.material.uniforms.uReflectivity.value = nv; });
      break;
    }
    case 'Space': rotatableObjects.forEach(o => o.rotation.set(0,0,0)); break;
    case 'KeyI':
      console.log('Interactive objects:', rotatableObjects.map((o, i) => ({
        name: o.name || `obj${i}`, position: o.position, rotation: o.rotation
      })));
      break;
  }
});

// --- Loop ---
let time = 0;
function animate() {
  requestAnimationFrame(animate);
  time += 0.016;

  if (autoRotateEnabled && rotatableObjects.length) {
    rotatableObjects.forEach(o => { o.rotation.y += rotationSpeed; });
  }
  cameraControls.update();

  // اگر نور را جابه‌جا می‌کنی، مارکر را همراهش حرکت بده
  lightMarker.position.copy(directionalLight.position);

  // یکنواخت‌های SSR (اگر در شیدر تعریف شده‌اند)
  if (ssrBufferMaterial.uniforms.inverseProjectionMatrix) {
    ssrBufferMaterial.uniforms.inverseProjectionMatrix.value.copy(camera.projectionMatrix).invert();
  }
  if (ssrBufferMaterial.uniforms.inverseViewMatrix) {
    ssrBufferMaterial.uniforms.inverseViewMatrix.value.copy(camera.matrixWorldInverse).invert();
  }
  if (ssrBufferMaterial.uniforms.viewMatrix) {
    ssrBufferMaterial.uniforms.viewMatrix.value.copy(camera.matrixWorldInverse);
  }
  if (ssrBufferMaterial.uniforms.cameraWorldPosition) {
    ssrBufferMaterial.uniforms.cameraWorldPosition.value.copy(camera.position);
  }
  if (ssrBufferMaterial.uniforms.time) {
    ssrBufferMaterial.uniforms.time.value = time;
  }

  // 1) G-buffer Pass
  renderer.setRenderTarget(gBuffer);
  renderer.clear();
  renderer.render(scene, camera);

  // 2) SSR Pass (fullscreen quad)
  renderer.setRenderTarget(null);
  renderer.clear();
  renderer.render(ssrScene, postCamera);
}
animate();

// --- Resize ---
window.addEventListener('resize', () => {
  const width = window.innerWidth, height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);

  gBuffer.setSize(width, height);
  if (ssrBufferMaterial.uniforms.resolution) {
    ssrBufferMaterial.uniforms.resolution.value.set(width, height);
  }
});
