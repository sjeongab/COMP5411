import * as THREE from 'three'
import {addPlainObjects} from './object/addObjects.js'
import { OrbitControls } from 'OrbitControls'

let lastFrameTime, fpsElem;
let camera, cameraControls;
let isAnimating;

function drawSSR(){

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


//* ---------------- Set up camera ---------------- */
camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
camera.position.set(0, 75, 160);
cameraControls = new OrbitControls(camera, renderer.domElement);
cameraControls.target.set(0, 0, 0);
cameraControls.maxDistance = 400;
cameraControls.minDistance = 10;
cameraControls.update();

/* ---------------- Display FPS ---------------- */
lastFrameTime = 0;
fpsElem = document.getElementById('fps');

animate();
};

function animate(currentTime){
  console.log("drawing ssr");
  requestAnimationFrame(animate);

  cameraControls.update();

  //renderer.clear(true, true, true);
  //renderer.render(scene, camera);
  
  /* ---------------- Display FPS ---------------- */
  currentTime *= 0.001;
  const deltaTime = currentTime - lastFrameTime;
  lastFrameTime = currentTime;
  const fps = 1 / deltaTime;
  fpsElem.textContent = `FPS: ${fps.toFixed(1)}`;

};

export {drawSSR};