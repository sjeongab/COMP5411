import {addObjects} from './object/addObjects.js'

import * as THREE from 'three'
import { OrbitControls } from 'OrbitControls'
import { SSRPass } from 'three/addons/postprocessing/SSRPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { ssrBuffer, ssrBufferMaterial } from './ssr/ssrBuffer.js'
import {gBuffer, gBufferMaterial} from './gBuffer/gBuffer.js'

// --- Setup ---
const reflections = [];
let composer, ssrPass, cameraControls;


const MODE = "scene"

const scene = new THREE.Scene();
const ssrScene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
camera.position.set(0, 75, 160);
//camera.lookAt(0,0,0);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

cameraControls = new OrbitControls( camera, renderer.domElement );
cameraControls.target.set( 0, 0, 0 );
cameraControls.maxDistance = 400;
cameraControls.minDistance = 10;
cameraControls.update();


// add plane
const planeGeometry = new THREE.PlaneGeometry(150, 150); // Width, Height
const planeMaterial = new THREE.MeshPhongMaterial({ color: 0x222222, side: THREE.DoubleSide, reflectivity: 1});
//const plane = new THREE.Mesh(planeGeometry, planeMaterial);
const plane = new THREE.Mesh(planeGeometry, gBufferMaterial);
plane.rotateX(-Math.PI/2);
scene.add(plane); 
//reflections.push(plane);


addObjects(scene);


// Add lights
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

const postProcessQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ssrBufferMaterial);
ssrScene.add(postProcessQuad);

composer = new EffectComposer( renderer );
ssrPass = new SSRPass( {
  renderer,
  scene,
  camera,
  width: window.innerWidth,
  height: window.innerHeight,
  groundReflector: null,
  selects: reflections
} );

composer.addPass( ssrPass );
composer.addPass( new OutputPass() );



//ssrBuffer Trial
const redPlane = new THREE.Mesh(planeGeometry, ssrBufferMaterial);
scene.add(redPlane);



// --- The Render Loop ---
function animate() {
  /*requestAnimationFrame(animate);
  if (MODE == "scene"){
    renderer.setRenderTarget(gBuffer);
    renderer.render(scene, camera);
    composer.render();
  }*/
  requestAnimationFrame(animate);
  cameraControls.update();

  // 1. G-buffer Pass: Render normals and depth
  renderer.setRenderTarget(gBuffer);
  renderer.render(scene, camera);

  // 2. SSR Pass: Render to screen using the buffers
  renderer.setRenderTarget(null);
  ssrBufferMaterial.uniforms.inverseProjectionMatrix.value.copy(camera.projectionMatrix).invert();
  ssrBufferMaterial.uniforms.inverseViewMatrix.value.copy(camera.matrixWorld);
  renderer.render(ssrScene, camera);

  composer.render();
}

animate();

// Handle window resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});