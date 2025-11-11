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
    
    // For correct mirror orientation, reflect the up vector (invert y-component)
    reflectedCamera.up.copy(camera.up);
    reflectedCamera.up.y = -reflectedCamera.up.y; // Typically from (0,1,0) to (0,-1,0)
    
    
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

        cameraPos: { value: camera.position},
        uCamMatrix: { value: camera.matrixWorld},
        invViewProj: {value: new THREE.Matrix4()},
        spheres: {
                    value: [
                        {
                            position: new THREE.Vector3(0, 20, 0),
                            radius: 20.0,
                            color: new THREE.Color(0XE7C88D),
                            reflectivity: 0.6
                        },
                        {
                            position: new THREE.Vector3(-35, 8, -20),
                            radius: 8.0,
                            color: new THREE.Color(0xE7577F7),
                            reflectivity: 1.0
                        },
                        {
                            position: new THREE.Vector3(-20, 9.5, 40),
                            radius: 9.0,
                            color: new THREE.Color(0xB1C193), // Green
                            reflectivity: 0.5
                        },
                        {
                            position: new THREE.Vector3(15, 10, 25),
                            radius:10.0,
                            color: new THREE.Color(0xDF9D97),
                            reflectivity: 0.0
                        },
                        {
                            position: new THREE.Vector3(-44, 4, 34),
                            radius: 5.0,
                            color: new THREE.Color(0xABD0C4), // Green
                            reflectivity: 0.2
                        },
                    ]
                },
                boxes: { value: [
                    {
                        position: new THREE.Vector3(-40, 5.1, 15),
                        scale: 10,
                        color: new THREE.Color(0XF0DD98),
                        reflectivity: 0.7
                    },
                    {
                        position: new THREE.Vector3(35, 9.5, 40.0),
                        scale: 18,
                        color: new THREE.Color(0xA5CCD6),
                        reflectivity: 0.8
                    },
                    {
                        position: new THREE.Vector3(70, 9.5, 25),
                        scale: 14,
                        color: new THREE.Color(0xA3C0D3),
                        reflectivity: 0.9
                    },
        
                ]},
                planes: {
                    value: [
                        { 
                            position: new THREE.Vector3(0, -1, 0),
                            normal: new THREE.Vector3(0, 1, 0), 
                            offset: 0.0, 
                            color: new THREE.Color(0x808080), 
                            reflectivity: 0.6, 
                            scale: 200.0 }
                    ]
        
                },
    },
    lightDir: { value: new THREE.Vector3(0.5, 0.7, 0.5).normalize() },
    lightColor: { value: new THREE.Color(1.0, 1.0, 1.0) },
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

      hybridMaterial.uniforms.uCamMatrix.value.copy(camera.matrixWorld);
      hybridMaterial.uniforms.invViewProj.value.copy(camera.projectionMatrix).invert();
      reflectionMatrix.multiplyMatrices(camera.projectionMatrix, reflectedViewMatrix); //try ssr camera?

      //hybridMaterial.uniforms.inverseProjectionMatrix.value.copy(ssrCamera.projectionMatrix).invert();
      //hybridMaterial.uniforms.inverseViewMatrix.value.copy(ssrCamera.matrixWorldInverse).invert();
      //hybridMaterial.uniforms.cameraWorldPosition.value.copy(ssrCamera.position);
      //hybridMaterial.uniforms.reflectionMatrix.value.copy(reflectionMatrix);

      renderer.setRenderTarget(gBuffer);
      renderer.clear(true, true, true);
      renderer.render(scene, camera);

      // Render the scene
      renderer.setRenderTarget(null);
      renderer.clear(true, true, true);
      renderer.render(scene, camera);
      renderer.render(ssrScene, camera);

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