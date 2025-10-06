import * as THREE from 'three'
import { OrbitControls } from 'OrbitControls'

// --- Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


camera.position.z = 5;
const controls = new OrbitControls(camera, renderer.domElement);
// --- Create the Cube for Depth Rendering ---
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
scene.add(cube);

// --- Create a plane to add context to the scene ---
const planeGeometry = new THREE.PlaneGeometry(10, 10);
const planeMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.position.y = -2;
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

// --- Create the Render Target for the depth pass ---
const depthTexture = new THREE.DepthTexture();
const renderTarget = new THREE.WebGLRenderTarget(
  window.innerWidth,
  window.innerHeight,
  {
    depthTexture: depthTexture,
    depthBuffer: true,
  }
);

// --- Create the Post-Processing Quad and Material ---
const postScene = new THREE.Scene();
const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const postMaterial = new THREE.ShaderMaterial({
  uniforms: {
    tDepth: { value: depthTexture },
    cameraNear: { value: camera.near },
    cameraFar: { value: camera.far },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    #include <packing>
    uniform sampler2D tDepth;
    uniform float cameraNear;
    uniform float cameraFar;
    varying vec2 vUv;

    void main() {
      float fragCoordZ = texture2D(tDepth, vUv).x;
      // Convert normalized device coordinate depth to linear depth
      float viewZ = perspectiveDepthToViewZ(fragCoordZ, cameraNear, cameraFar);
      float linearDepth = viewZToOrthographicDepth(viewZ, cameraNear, cameraFar);

      // Invert for better visualization (near is white, far is black)
      gl_FragColor.rgb = vec3(1.0 - linearDepth);
      gl_FragColor.a = 1.0;
    }
  `,
});

const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial);
postScene.add(quad);

// --- The Render Loop ---
function animate() {
  requestAnimationFrame(animate);

  // Animate the cube for visual effect
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

  // --- Pass 1: Render the cube's depth to the render target ---
  // Store the original material and replace it with a depth material
  const originalMaterial = cube.material;
  //cube.material = new THREE.MeshDepthMaterial();

  //renderer.setRenderTarget(renderTarget);
  //renderer.clear(); // Clear the render target
  renderer.render(scene, camera);

  // Restore the original material
  //cube.material = originalMaterial;

  // --- Pass 2: Render the depth texture to the screen ---
  //renderer.setRenderTarget(null);
  //renderer.render(postScene, postCamera);

  controls.update();
}

animate();

// Handle window resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderTarget.setSize(window.innerWidth, window.innerHeight);
});
