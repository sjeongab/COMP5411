// averagedSsr.js (New file for SSR_Averaged mode)
import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls'
import {TEST_FPS, updateFPS} from '../helper/fps.js';
import {addSSRObjects} from '../object/addObjects.js'
import { addSkyBox } from '../object/addSkyBox.js'
import {loadSSRAveragedMaterial} from '../ssr/ssrAveragedBuffer.js'
import {gBuffer} from '../gBuffer/gBuffer.js'

let scene, camera, renderer;
let isRunning = true;

// Function to initialize the Three.js scene
export function init(canvas) {
  isRunning = true;
    // Set up the scene
    scene = new THREE.Scene();
    const ssrAveragedScene = new THREE.Scene();

    // Set up the renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.autoClear = false;
    document.body.appendChild(renderer.domElement);
    if ('outputColorSpace' in renderer) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    } else if ('outputEncoding' in renderer) {
      renderer.outputEncoding = THREE.sRGBEncoding;
    }

    // Set up the camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
    camera.position.set(0, 75, 160);

    let cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.target.set(0, 0, 0);
    cameraControls.maxDistance = 400;
    cameraControls.minDistance = 10;
    cameraControls.update();

    // Add objects
    addSSRObjects(scene);
    addSkyBox(renderer, scene);
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);
    
    const ssrAveragedMaterial = loadSSRAveragedMaterial(camera);
    const postProcessQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ssrAveragedMaterial);   
    ssrAveragedScene.add(postProcessQuad);

    // Start the animation loop
    function animate(currentTime)  {
      if(!isRunning) return;
      updateFPS(currentTime);
      cameraControls.update();

      ssrAveragedMaterial.uniforms.uCamMatrix.value.copy(camera.matrixWorld);
      
      ssrAveragedMaterial.uniforms.invViewProj.value.copy(camera.projectionMatrix).invert();
      ssrAveragedMaterial.uniforms.inverseProjectionMatrix.value.copy(camera.projectionMatrix).invert();
      ssrAveragedMaterial.uniforms.inverseViewMatrix.value.copy(camera.matrixWorldInverse).invert();
      const viewMatrix = camera.matrixWorldInverse;
      ssrAveragedMaterial.uniforms.cameraPos.value.copy(camera.position);const viewProj = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, viewMatrix);
      ssrAveragedMaterial.uniforms.viewProj.value.copy(viewProj);


      renderer.setRenderTarget(gBuffer);
      renderer.clear(true, true, true);
      renderer.render(scene, camera);

      // Render the scene
      renderer.setRenderTarget(null);
      renderer.clear(true, true, true);
      renderer.render(scene, camera);
      for(let i = 0; i<TEST_FPS; i++){
          renderer.render(ssrAveragedScene, camera);
      }

      // Request the next animation frame
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate); // Return the animation frame ID
}

// Function to clean up resources when switching scenes
export function stop() {
    document.body.removeChild(document.body.lastElementChild);
    renderer.dispose();
    isRunning = false;
}