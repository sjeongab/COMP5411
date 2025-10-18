import {addObjects} from './object/addObjects.js'
import {addSkyBox} from './object/addSkyBox.js'

import * as THREE from 'three'
import { OrbitControls } from 'OrbitControls'
//import { ssrBuffer, ssrBufferMaterial } from './ssr/ssrBuffer.js'
import {gBuffer, gBufferMaterial, gColorTexture, gNormalTexture, gPositionTexture, gReflectionTexture} from './gBuffer/gBuffer.js'

// --- Setup ---
let cameraControls;


//const MODE = "scene"
const MODE = "SSR";

const scene = new THREE.Scene();
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

const cubeLoader = new THREE.CubeTextureLoader();
const skyboxTexture = cubeLoader.load([
  'https://threejs.org/examples/textures/cube/Park3Med/px.jpg',
  'https://threejs.org/examples/textures/cube/Park3Med/nx.jpg',
  'https://threejs.org/examples/textures/cube/Park3Med/py.jpg',
  'https://threejs.org/examples/textures/cube/Park3Med/ny.jpg',
  'https://threejs.org/examples/textures/cube/Park3Med/pz.jpg',
  'https://threejs.org/examples/textures/cube/Park3Med/nz.jpg'
]);

const skyboxMaterial = new THREE.ShaderMaterial({
  uniforms: { tCube: { value: skyboxTexture } },
  vertexShader: `
    varying vec3 v_normal;
    void main() {
        v_normal = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform samplerCube tCube;
    varying vec3 v_normal;
    void main() {
        gl_FragColor = textureCube(tCube, v_normal);
    }
  `,
  side: THREE.BackSide, // Render the inside of the cube
  depthWrite: false, // Prevents the skybox from being written to the depth buffer
});

const skyboxGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
const skyboxMesh = new THREE.Mesh(skyboxGeometry, skyboxMaterial);

// 3. Create a separate scene for the skybox
const skyboxScene = new THREE.Scene();
skyboxScene.add(skyboxMesh);

skyboxMesh.onBeforeRender = function(renderer, scene, camera) {
  this.position.copy(camera.position);
};

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
            gBackground: {value: skyboxTexture},
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
addSkyBox(scene);


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
  renderer.render(skyboxScene, camera);
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