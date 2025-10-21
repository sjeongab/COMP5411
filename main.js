import {addObjects} from './object/addObjects.js'
import * as THREE from 'three'
import { OrbitControls } from 'OrbitControls'
import {gBuffer, gBufferMaterial, gColorTexture, gNormalTexture, gPositionTexture, gReflectionTexture} from './gBuffer/gBuffer.js'

let cameraControls;
let mode = "SSR"; // Default mode

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

import {ssrVertexShader} from './ssr/ssrVertexShader.js';
import {ssrFragmentShader} from './ssr/ssrFragmentShader.js';

/* ---------------- Skybox (online) ---------------- */
const cubeUrls = [
  'https://threejs.org/examples/textures/cube/Park3Med/px.jpg', // +X
  'https://threejs.org/examples/textures/cube/Park3Med/nx.jpg', // -X
  'https://threejs.org/examples/textures/cube/Park3Med/py.jpg', // +Y
  'https://threejs.org/examples/textures/cube/Park3Med/ny.jpg', // -Y
  'https://threejs.org/examples/textures/cube/Park3Med/pz.jpg', // +Z
  'https://threejs.org/examples/textures/cube/Park3Med/nz.jpg'  // -Z
];

const cubeLoader = new THREE.CubeTextureLoader();
if (cubeLoader.setCrossOrigin) cubeLoader.setCrossOrigin('anonymous');

const skyboxTexture = cubeLoader.load(
  cubeUrls,
  () => console.log('[skybox] Successfully loaded'),
  (progress) => console.log('[skybox] Loading progress:', progress),
  (err) => console.error('[skybox] Failed to load:', err)
);

// Correct cube texture color space
if ('SRGBColorSpace' in THREE) {
  skyboxTexture.colorSpace = THREE.SRGBColorSpace;
} else if ('sRGBEncoding' in THREE) {
  skyboxTexture.encoding = THREE.sRGBEncoding;
}

// Use Three.js built-in cube shader for skybox
const skyboxMaterial = new THREE.ShaderMaterial({
  uniforms: THREE.UniformsUtils.clone(THREE.ShaderLib.cube.uniforms),
  vertexShader: THREE.ShaderLib.cube.vertexShader,
  fragmentShader: THREE.ShaderLib.cube.fragmentShader,
  side: THREE.BackSide,
  depthWrite: false
});
skyboxMaterial.uniforms.tCube.value = skyboxTexture;

// Large cube for skybox background
const skyboxGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
const skyboxMesh = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
skyboxScene.add(skyboxMesh);

// Follow camera position to keep skybox around camera
skyboxMesh.onBeforeRender = function (renderer, _scene, cam) {
  this.position.copy(cam.position);
};

/* ---------------- Mode selection UI ---------------- */
const select = document.createElement('select');
select.style.position = 'absolute';
select.style.top = '10px';
select.style.right = '10px';
select.style.padding = '5px';
select.innerHTML = `
  <option value="scene">Scene</option>
  <option value="SSR" selected>SSR</option>
`;
select.style.zIndex = 2;
document.body.appendChild(select);

// Update mode when selection changes
select.addEventListener('change', () => {
  mode = select.value;
  ssrBufferMaterial.uniforms.mode.value = mode === 'scene' ? 0 : 1;
});

/* ---------------- SSR material ---------------- */
let ssrBufferMaterial = new THREE.ShaderMaterial({
  vertexShader: ssrVertexShader,
  fragmentShader: ssrFragmentShader,
  glslVersion: THREE.GLSL3,
  uniforms: {
    gColor: { value: gColorTexture },
    gNormal: { value: gNormalTexture },
    gPosition: { value: gPositionTexture },
    gReflection: { value: gReflectionTexture },
    gDepth: { value: gBuffer.depthTexture },
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    projectionMatrix: { value: ssrCamera.projectionMatrix },
    inverseProjectionMatrix: { value: new THREE.Matrix4() },
    inverseViewMatrix: { value: new THREE.Matrix4() },
    cameraWorldPosition: { value: ssrCamera.position },
    cameraNear: { value: ssrCamera.near },
    cameraFar: { value: ssrCamera.far },
    mode: { value: mode === 'scene' ? 0 : 1 },
  },
  transparent: true,
  depthTest: false,
  depthWrite: false,
  blending: THREE.NormalBlending
});

/* ---------------- Scene content & lights ---------------- */
addObjects(scene);

const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

/* ---------------- Fullscreen quad for SSR ---------------- */
const postProcessQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ssrBufferMaterial);
ssrScene.add(postProcessQuad);

/* ---------------- Render loop ---------------- */
function animate(currentTime) {
  
  requestAnimationFrame(animate);

  cameraControls.update();

  // Update matrices for SSR
  ssrBufferMaterial.uniforms.inverseProjectionMatrix.value.copy(ssrCamera.projectionMatrix).invert();
  ssrBufferMaterial.uniforms.inverseViewMatrix.value.copy(ssrCamera.matrixWorldInverse).invert();
  ssrBufferMaterial.uniforms.cameraWorldPosition.value.copy(ssrCamera.position);

  // 1) G-Buffer Pass (to RenderTarget)
  renderer.setRenderTarget(gBuffer);
  renderer.clear(true, true, true);
  renderer.render(scene, camera);

  // 2) Skybox + SSR Pass (to screen)
  renderer.setRenderTarget(null);
  renderer.clear(true, true, true); // Clear color, depth, and stencil
  renderer.render(skyboxScene, camera); // Render skybox first
  renderer.render(scene, camera); // Render scene objects
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
  if (ssrBufferMaterial && ssrBufferMaterial.uniforms.resolution) {
    ssrBufferMaterial.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
  }
});
