import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls'
import {updateFPS} from '../fps.js';
import {addSSRObjects} from '../object/addObjects.js'
import { addSkyBox } from '../object/addSkyBox.js'
import { hybridVertexShader } from '../hybrid/hybridVertexShader.js';
import { hybridFragmentShader } from '../hybrid/hybridFragmentShader.js';
import {gBuffer} from '../gBuffer/gBuffer.js'

let scene, camera, renderer;
let isRunning = true;

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

    const reflectedViewMatrix = new THREE.Matrix4();
    let reflectedCamera;
    function updateReflectedViewMatrix() {
    // Create a virtual reflected camera (clone the original to match properties)
    reflectedCamera = camera.clone();
    
    // Reflect the camera position over the plane (y=0)
    reflectedCamera.position.copy(camera.position);
    reflectedCamera.position.y = -camera.position.y; // Reflect over y=0
    
    // Reflect the target (if it's not on the plane; here (0,0,0) is on the plane, so it stays the same)
    //const reflectedTarget = cameraControls.target.clone();
    //reflectedTarget.y = -reflectedTarget.y; // But since y=0, it remains (0,0,0)
    
    // For correct mirror orientation, reflect the up vector (invert y-component)
    reflectedCamera.up.copy(camera.up);
    reflectedCamera.up.y = -reflectedCamera.up.y; // Typically from (0,1,0) to (0,-1,0)
    
    // Make the reflected camera look at the reflected target
    //reflectedCamera.lookAt(reflectedTarget);
    
    // Get the reflected view matrix (inverse of the world matrix)
    reflectedCamera.updateMatrixWorld(); // Ensure matrices are updated
    reflectedViewMatrix.copy(reflectedCamera.matrixWorldInverse);
    }

    updateReflectedViewMatrix();

    const reflectionMatrix = new THREE.Matrix4();
    reflectionMatrix.multiplyMatrices(camera.projectionMatrix, reflectedViewMatrix);

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
    
    const hybridMaterial = new THREE.ShaderMaterial({
    vertexShader: hybridVertexShader,
    fragmentShader: hybridFragmentShader,
    glslVersion: THREE.GLSL3,
    uniforms: {
        gColor: { value: gBuffer.textures[0] },
        gNormal: { value: gBuffer.textures[1] },
        gPosition: { value: gBuffer.textures[2] },
        gReflection: { value: gBuffer.textures[3] },
        gDepth: { value: gBuffer.depthTexture },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        projectionMatrix: { value: ssrCamera.projectionMatrix },
        inverseProjectionMatrix: { value: new THREE.Matrix4() },
        inverseViewMatrix: { value: new THREE.Matrix4() },
        reflectionMatrix: {value: reflectionMatrix},
        cameraWorldPosition: { value: ssrCamera.position },
        cameraNear: { value: ssrCamera.near },
        cameraFar: { value: ssrCamera.far },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NormalBlending
    });
    const postProcessQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), hybridMaterial);   
    ssrScene.add(postProcessQuad);

    // Add Planar Reflection here (add buffer, shaders too)

    // Start the animation loop
    function animate(currentTime)  {
      if(!isRunning) return;
      updateFPS(currentTime);
      cameraControls.update();
      
      updateReflectedViewMatrix();
      reflectionMatrix.multiplyMatrices(camera.projectionMatrix, reflectedViewMatrix); //try ssr camera?

      hybridMaterial.uniforms.inverseProjectionMatrix.value.copy(ssrCamera.projectionMatrix).invert();
      hybridMaterial.uniforms.inverseViewMatrix.value.copy(ssrCamera.matrixWorldInverse).invert();
      hybridMaterial.uniforms.cameraWorldPosition.value.copy(ssrCamera.position);
      hybridMaterial.uniforms.reflectionMatrix.value.copy(reflectionMatrix);

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
}