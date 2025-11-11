import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls'
import {updateFPS} from '../fps.js';
import {addSSRObjects} from '../object/addObjects.js'
import { addSkyBox } from '../object/addSkyBox.js'
import {loadSSRMaterial} from '../ssr/ssrBuffer.js'
import {gBuffer} from '../gBuffer/gBuffer.js'
import { createReflectivePlane } from '../plane/planeBuffer.js';

let scene, camera, renderer;
let isRunning = true;
let reflectivePlaneMaterial = null;

// Function to initialize the Three.js scene
export function init(canvas) {
  isRunning = true;
    // Set up the scene
    scene = new THREE.Scene();
    const ssrScene = new THREE.Scene();

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
    const ssrCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

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
    
    const ssrMaterial = loadSSRMaterial(ssrCamera);
    const postProcessQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ssrMaterial);   
    ssrScene.add(postProcessQuad);

    // Add Planar Reflection here (add buffer, shaders too)
      // If addPlainObjects adds a regular plane, hide it
      scene.traverse((obj) => {
        if (
          obj.isMesh &&
          obj.geometry &&
          obj.geometry.type === 'PlaneGeometry'
        ) {
          obj.visible = false;
        }
      });
    
      // Reflective plane with custom raymarch shader
      const { mesh: reflectivePlane, material } = createReflectivePlane(scene);
      // Raise it a bit to avoid depth conflict with anything
      reflectivePlane.position.y += 0.001;
      scene.add(reflectivePlane);
      reflectivePlaneMaterial = material;

    // Start the animation loop
    function animate(currentTime)  {
      if(!isRunning) return;
      updateFPS(currentTime);
      cameraControls.update();

      ssrMaterial.uniforms.inverseProjectionMatrix.value.copy(ssrCamera.projectionMatrix).invert();
      ssrMaterial.uniforms.inverseViewMatrix.value.copy(ssrCamera.matrixWorldInverse).invert();
      ssrMaterial.uniforms.cameraWorldPosition.value.copy(ssrCamera.position);

      // Update shader uniforms for plane
    if (reflectivePlaneMaterial && reflectivePlaneMaterial.uniforms) {
      if (reflectivePlaneMaterial.uniforms.cameraPos) {
        reflectivePlaneMaterial.uniforms.cameraPos.value.copy(camera.position);
        const viewMatrix = camera.matrixWorldInverse;
        const viewProj = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, viewMatrix);
        reflectivePlaneMaterial.uniforms.uViewProjectionMatrix.value.copy(viewProj);
        //console.log(camera.projectionMatrix);
      }
      if (reflectivePlaneMaterial.uniforms.lightDir) {
        // If light is static, this is enough
        reflectivePlaneMaterial.uniforms.lightDir.value
          .set(5, 10, 7)
          .normalize();
      }
    }

      renderer.setRenderTarget(gBuffer);
      renderer.clear(true, true, true);
      renderer.render(scene, camera);

      // Render the scene
      renderer.setRenderTarget(null);
      renderer.clear(true, true, true);
      renderer.render(scene, camera);
      renderer.render(ssrScene, ssrCamera);

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
    reflectivePlaneMaterial = null;
}