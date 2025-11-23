import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls'
import { TEST_FPS, updateFPS } from '../fps.js';
import {addSSRObjects} from '../object/addObjects.js'
import { addSkyBox } from '../object/addSkyBox.js'
import {loadSSRMaterial} from '../ssr/ssrBuffer.js'
import {gBuffer} from '../gBuffer/gBuffer.js'

let scene, camera, renderer;
let isRunning = true;

// Function to initialize the Three.js scene
export function init(canvas) {
    isRunning = true;
    scene = new THREE.Scene();
    const ssrScene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.autoClear = false;
    document.body.appendChild(renderer.domElement);
    /*if ('outputColorSpace' in renderer) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    } else if ('outputEncoding' in renderer) {
      renderer.outputEncoding = THREE.sRGBEncoding;
    }*/


    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
    camera.position.set(0, 75, 160);

    let cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.target.set(0, 0, 0);
    cameraControls.maxDistance = 400;
    cameraControls.minDistance = 10;
    cameraControls.update();

    addSSRObjects(scene);
    addSkyBox(renderer, scene);

    const ssrMaterial = loadSSRMaterial(camera);
    const postProcessQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ssrMaterial);   
    ssrScene.add(postProcessQuad);

    function animate(currentTime)  {
      if(!isRunning) return;
      updateFPS(currentTime);
      cameraControls.update();

      ssrMaterial.uniforms.uCamMatrix.value.copy(camera.matrixWorld);
      
      ssrMaterial.uniforms.invViewProj.value.copy(camera.projectionMatrix).invert();
      const viewMatrix = camera.matrixWorldInverse;
      ssrMaterial.uniforms.cameraPos.value.copy(camera.position);
      const viewProj = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, viewMatrix);
      ssrMaterial.uniforms.viewProj.value.copy(viewProj);


      renderer.setRenderTarget(gBuffer);
      renderer.clear();
      renderer.render(scene, camera);

      renderer.setRenderTarget(null);
      renderer.clear(true, false, false);
      renderer.render(scene, camera);
      for(let i = 0; i<TEST_FPS; i++){
        renderer.render(ssrScene, camera);
      }


      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
}


export function stop() {
    document.body.removeChild(document.body.lastElementChild);
    renderer.dispose();
    isRunning = false;
}