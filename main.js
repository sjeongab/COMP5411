import {addObjects} from './object/addObjects.js'

import * as THREE from 'three'
import { OrbitControls } from 'OrbitControls'
//import { ssrBuffer, ssrBufferMaterial } from './ssr/ssrBuffer.js'
import {gBuffer, gBufferMaterial, gColorTexture, gNormalTexture, gPositionTexture, gReflectionTexture} from './gBuffer/gBuffer.js'

// --- Setup ---
let cameraControls;


//const MODE = "scene"
const MODE = "SSR";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x4422bb);
const ssrScene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
camera.position.set(0, 75, 160);
const ssrCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

cameraControls = new OrbitControls( camera, renderer.domElement );
cameraControls.target.set( 0, 0, 0 );
cameraControls.maxDistance = 400;
cameraControls.minDistance = 10;
cameraControls.update();

import {ssrVertexShader} from './ssr/ssrVertexShader.js';
import {ssrFragmentShader} from './ssr/ssrFragmentShader.js';



const ssrBufferMaterial = new THREE.ShaderMaterial({
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
        }
});


addObjects(scene);


// Add lights
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

const postProcessQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ssrBufferMaterial);
ssrScene.add(postProcessQuad);


// --- The Render Loop ---
function animate() {
  requestAnimationFrame(animate);
  cameraControls.update();
  if (MODE == "scene"){
    renderer.setRenderTarget(gBuffer);
    renderer.render(scene, camera);
    composer.render();
  }
  else if (MODE == "SSR"){

  ssrBufferMaterial.uniforms.inverseProjectionMatrix.value.copy(ssrCamera.projectionMatrix).invert();
  ssrBufferMaterial.uniforms.inverseViewMatrix.value.copy(ssrCamera.matrixWorldInverse).invert();
  ssrBufferMaterial.uniforms.cameraWorldPosition.value.copy(ssrCamera.position);

  // 1. G-buffer Pass: Render normals and depth
  renderer.setRenderTarget(gBuffer);
  renderer.clear();
  renderer.render(scene, camera);

  // 2. SSR Pass: Render to screen using the buffers
  renderer.setRenderTarget(null);
  renderer.render(ssrScene, ssrCamera);
  }
}

animate();

// Handle window resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});