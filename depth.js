import {vertexShaderSource} from './vertexShader.js'
import {fragmentShaderSource} from './fragmentShader.js'
import {addObjects} from './object/addObjects.js'

import * as THREE from 'three'
import { OrbitControls } from 'OrbitControls'
import {pass, mrt} from 'three/tsl'
//import {pass} from 'three/tsl'
// --- Setup ---
const MODE = "scene"
//const MODE = "depth"

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x333344);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, -5, 2);
camera.lookAt(0,0,0);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

var controls = new OrbitControls(camera, renderer.domElement);

// depth scene
const depthTexture = new THREE.DepthTexture();
const renderTarget = new THREE.WebGLRenderTarget(
  window.innerWidth,
  window.innerHeight,
  {
    depthTexture: depthTexture,
    depthBuffer: true,
  }
);
const depthScene = new THREE.Scene();
const depthCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const depthControls = new OrbitControls(depthCamera, renderer.domElement);
const depthMaterial = new THREE.RawShaderMaterial({
  uniforms: {
    tDepth: { value: depthTexture },
    cameraNear: { value: camera.near },
    cameraFar: { value: camera.far },
  },
  vertexShader: vertexShaderSource,
  fragmentShader: fragmentShaderSource,
  glslVersion: THREE.GLSL3
});

const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), depthMaterial);
depthScene.add(quad);



// add plane
const planeGeometry = new THREE.PlaneGeometry(15, 15); // Width, Height
const planeMaterial = new THREE.MeshPhongMaterial({ color: 0x222222, side: THREE.DoubleSide, reflectivity: 1});
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
scene.add(plane); 


addObjects(scene);


// Add lights
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);


// --- The Render Loop ---
function animate() {
  requestAnimationFrame(animate);

  if (MODE == "scene"){
    renderer.render(scene, camera);
    controls.update();
  }
  else if (MODE == "depth"){
    renderer.setRenderTarget(renderTarget);
    renderer.clear(); // Clear the render target
    renderer.render(scene, camera);

    renderer.setRenderTarget(null);
    renderer.render(depthScene, depthCamera);

    depthControls.update();
  }
}

animate();

// Handle window resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderTarget.setSize(window.innerWidth, window.innerHeight);
});