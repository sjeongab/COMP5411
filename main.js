import {vertexShaderSource} from './vertexShader.js'
import {fragmentShaderSource} from './fragmentShader.js'
import {addObjects} from './object/addObjects.js'

import * as THREE from 'three'
import { OrbitControls } from 'OrbitControls'
// Get the canvas element and create a WebGL renderer
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create the shader material with glslVersion
const material = new THREE.ShaderMaterial({
    vertexShader: vertexShaderSource,
    fragmentShader: fragmentShaderSource,
    glslVersion: THREE.GLSL3
});

// Set up the scene and camera
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0,-5,2);
camera.lookAt(0, 0, 0);

var controls = new OrbitControls( camera, renderer.domElement );

const planeGeometry = new THREE.PlaneGeometry(15, 15); // Width, Height

// Create a basic material and set its color
const planeMaterial = new THREE.MeshPhongMaterial({ color: 0x222222, side: THREE.DoubleSide }); // Green color

// Create a mesh using the plane geometry and material
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
scene.add(plane); // Add the plane to the scene


addObjects(scene);



// Add lights
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);


// Animation loop
function animate() {
    requestAnimationFrame(animate);


    renderer.render(scene, camera); // Render the main scene (optional, can handle differently)


    controls.update();
}

// Start the animation
animate();