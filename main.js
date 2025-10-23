import {addObjects} from './object/addObjects.js'
import * as THREE from 'three'
import { OrbitControls } from 'OrbitControls'
import {gBuffer, gBufferMaterial, gColorTexture, gNormalTexture, gPositionTexture, gReflectionTexture} from './gBuffer/gBuffer.js'
import { addSkyBox } from './object/addSkyBox.js'
import {loadSSRMaterial} from './ssr/ssrBuffer.js'
import {ssrVertexShader} from './ssr/ssrVertexShader.js';
import {ssrFragmentShader} from './ssr/ssrFragmentShader.js';

let cameraControls;
let mode = "scene"; // Default mode

const scene = new THREE.Scene();
const ssrScene = new THREE.Scene();
const skyboxScene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
camera.position.set(0, 75, 160);

const ssrCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// Assumes canvas variable exists in HTML
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const fpsElem = document.getElementById('fps');
let lastFrameTime = 0;

// Set renderer color space
if ('outputColorSpace' in renderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
} else if ('outputEncoding' in renderer) {
  renderer.outputEncoding = THREE.sRGBEncoding;
}

// Disable auto clear to control background rendering
renderer.autoClear = false;

cameraControls = new OrbitControls(camera, renderer.domElement);
cameraControls.target.set(0, 0, 0);
cameraControls.maxDistance = 400;
cameraControls.minDistance = 10;
cameraControls.update();

const ssrMaterial = loadSSRMaterial(ssrCamera, mode);

/* ---------------- Skybox (online) ---------------- */

addSkyBox(renderer, skyboxScene);


const modeSelect = document.getElementById("modeSelect");
modeSelect.addEventListener("change", (event) => {
    mode = event.target.value;
    ssrMaterial.uniforms.mode.value = mode === 'scene' ? 0 : 1;
});




/* ---------------- Scene content & lights ---------------- */
addObjects(scene);

const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

/* ---------------- Fullscreen quad for SSR ---------------- */
const postProcessQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ssrMaterial);
ssrScene.add(postProcessQuad);

/* ---------------- Render loop ---------------- */
function animate(currentTime) {
  
  requestAnimationFrame(animate);

  cameraControls.update();

  // Update matrices for SSR
  ssrMaterial.uniforms.inverseProjectionMatrix.value.copy(ssrCamera.projectionMatrix).invert();
  ssrMaterial.uniforms.inverseViewMatrix.value.copy(ssrCamera.matrixWorldInverse).invert();
  ssrMaterial.uniforms.cameraWorldPosition.value.copy(ssrCamera.position);

  // 1) G-Buffer Pass (to RenderTarget)
  renderer.setRenderTarget(gBuffer);
  renderer.clear(true, true, true);
  renderer.render(scene, camera);

  // 2) Skybox + SSR Pass (to screen)
  renderer.setRenderTarget(null);
  renderer.clear(true, true, true); // Clear color, depth, and stencil
  renderer.render(skyboxScene, camera); // Render skybox first
  renderer.render(scene, camera); // Render skybox + scene objects
  renderer.render(ssrScene, ssrCamera); // Render SSR post-process quad
  currentTime *= 0.001;
  const deltaTime = currentTime - lastFrameTime;
  lastFrameTime = currentTime;
  const fps = 1 / deltaTime;
  fpsElem.textContent = `FPS: ${fps.toFixed(1)}`;
}

requestAnimationFrame(animate);

/* ---------------- Resize ---------------- */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Update resolution in uniforms if needed
  if (ssrMaterial && ssrMaterial.uniforms.resolution) {
    ssrMaterial.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
  }
});
