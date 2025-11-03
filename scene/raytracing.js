import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';
import {updateFPS} from '../fps.js';
import { objects } from '../object/addObjects.js';
import { raytracingVertexShader } from '../raytracing/raytracingVertexShader.js';
import { raytracingFragmentShader } from '../raytracing/raytracingFragmentShader.js';


let scene, camera, renderer;
let isRunning = true;

export function init(canvas){
    isRunning = true;
    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    //renderer.autoClear = false;

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
    camera.position.set(0, 75, 160);

    let cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.target.set(0, 0, 0);
    cameraControls.maxDistance = 400;
    cameraControls.minDistance = 10;
    cameraControls.update();

    /*const sphereGeometry = new THREE.SphereGeometry(20.0, 32, 32);
    const sphereMaterial = new THREE.MeshPhongMaterial({ color: new THREE.Color(0xFF0000), shininess: 0.5 });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(0, 20, 0); // Position the sphere above the plane
    scene.add(sphere);*/

    // Full-screen quad for ray tracing (covers the entire viewport)
    

    
    // Custom shader for ray tracing
    const rayTraceMaterial = new THREE.ShaderMaterial({
    uniforms: {
        // Camera properties
        cameraPos: { value: camera.position },
        uCamMatrix: { value: camera.matrixWorld},
        invViewProj: { value: new THREE.Matrix4()},
        //cameraDir: { value: new THREE.Vector3(0, 0, -1) }, // Forward direction; updated in animate
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },

        spheres: {
            value: [
                // Sphere 1
                {
                    position: new THREE.Vector3(0, 20, 0),
                    radius: 20.0,
                    color: new THREE.Color(0x12537a), // Red
                    reflectivity: 0.5
                },
                // Sphere 2
                {
                    position: new THREE.Vector3(-35.0, 8, -20.0),
                    radius: 8.0,
                    color: new THREE.Color(0x00ff00), // Green
                    reflectivity: 0.8
                }
            ]
        },
        
        // Lighting (from earlier shaders)
        lightDir: { value: new THREE.Vector3(0.5, 0.7, 0.5).normalize() },
        lightColor: { value: new THREE.Color(1.0, 1.0, 1.0) },
        //ambientColor: { value: new THREE.Color(0x404040) },
    },
    vertexShader: raytracingVertexShader,
    fragmentShader: raytracingFragmentShader,
    glslVersion: THREE.GLSL3,
    side: THREE.DoubleSide
    });

    /*objects.forEach((object) => {
    if (object.type === 'plane') {
      const planeGeometry = new THREE.PlaneGeometry(200, 200); // Width, Height
      const planeGbufferMaterial = new THREE.ShaderMaterial({
          uniforms: {
              uColor: { value: object.color},
              uReflectivity: {value: object.reflectivity}, 
          },
          vertexShader: rayTraceMaterial.vertexShader,
          fragmentShader: rayTraceMaterial.fragmentShader,
          glslVersion:THREE.GLSL3,
      });
      const plane = new THREE.Mesh(planeGeometry, planeGbufferMaterial);
      plane.rotateX(-Math.PI/2);
      scene.add(plane);
    } else if (object.type == 'sphere'){
      var sphereGeometry = new THREE.SphereGeometry(object.scale, 32, 16);
        const sphereGbufferMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    uColor: { value: object.color },
                    uReflectivity: {value: object.reflectivity},
                },
                vertexShader: rayTraceMaterial.vertexShader,
                fragmentShader: rayTraceMaterial.fragmentShader,
                glslVersion:THREE.GLSL3,
            });
        var sphere = new THREE.Mesh(sphereGeometry, sphereGbufferMaterial);
        sphere.position.set(...object.position);
        scene.add(sphere);
    }
    else{
      const cubeGeometry = new THREE.BoxGeometry(object.scale, object.scale, object.scale);
        const cubeGbufferMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    uColor: { value: object.color },
                    uReflectivity: {value: object.reflectivity},
                },
                vertexShader: rayTraceMaterial.vertexShader,
                fragmentShader: rayTraceMaterial.fragmentShader,
                glslVersion:THREE.GLSL3,
            });
        const cube = new THREE.Mesh(cubeGeometry, cubeGbufferMaterial);
        cube.position.set(...object.position);
        scene.add(cube);
    }
    });*/

    // Create the quad mesh
    const quadGeometry = new THREE.PlaneGeometry(2, 2);
    const quad = new THREE.Mesh(quadGeometry, rayTraceMaterial);
    scene.add(quad);

    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        //rayTraceMaterial.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    });

    // Animate loop
    function animate(currentTime) {
        if(!isRunning) return;
        updateFPS(currentTime);
        cameraControls.update();

        requestAnimationFrame(animate);

        rayTraceMaterial.uniforms.cameraPos.value.copy(camera.position);
        rayTraceMaterial.uniforms.uCamMatrix.value.copy(camera.matrixWorld);
        //const viewProj = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); 
        rayTraceMaterial.uniforms.invViewProj.value.copy(camera.projectionMatrix).invert();

        // Update camera direction (if camera rotates)
        //const forward = new THREE.Vector3(0, 0, -1);
        //forward.applyQuaternion(camera.quaternion);
        //rayTraceMaterial.uniforms.cameraDir.value.copy(forward);
        
        // Update camera position if it changes
        //rayTraceMaterial.uniforms.cameraPos.value.copy(camera.position);

        //renderer.setRenderTarget(null);
        //renderer.clear(true, true, true);
        renderer.render(scene, camera);
    }
    animate();
}

// Function to clean up resources when switching scenes
export function stop() {
    document.body.removeChild(document.body.lastElementChild);
    renderer.dispose();
    isRunning = false;
}