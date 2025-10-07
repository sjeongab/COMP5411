import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';

// --- Scene Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 5, 10);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);

// --- Multiple Render Targets (MRT) for G-Buffer ---
const width = window.innerWidth;
const height = window.innerHeight;
const gBuffer = new THREE.WebGLMultipleRenderTargets(width, height, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType
});
gBuffer.depthTexture = new THREE.DepthTexture(width, height);

// --- Custom G-buffer shader materials for each object ---
const gBufferCubeMaterial = new THREE.RawShaderMaterial({
    uniforms: {
        uColor: { value: new THREE.Color(0xff0000) },
        uReflectivity: { value: 0.0 },
        uSpecular: { value: new THREE.Color(0x000000) }
    },
    vertexShader: `
        in vec3 position;
        in vec3 normal;
        uniform mat4 modelMatrix;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        out vec3 vNormal;
        void main() {
            vNormal = normal;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        precision highp float;
        layout(location = 0) out vec4 gBufferColor;
        layout(location = 1) out vec4 gBufferNormal;
        layout(location = 2) out vec4 gBufferReflectivity;
        in vec3 vNormal;
        uniform vec3 uColor;
        uniform float uReflectivity;
        uniform vec3 uSpecular;
        void main() {
            gBufferColor = vec4(uColor, 1.0);
            gBufferNormal = vec4(vNormal, 1.0);
            gBufferReflectivity = vec4(uSpecular, uReflectivity);
        }
    `,
    glslVersion: THREE.GLSL3
});

const gBufferPlaneMaterial = new THREE.RawShaderMaterial({
    uniforms: {
        uColor: { value: new THREE.Color(0xcccccc) },
        uReflectivity: { value: 1.0 },
        uSpecular: { value: new THREE.Color(0xffffff) }
    },
    vertexShader: gBufferCubeMaterial.vertexShader,
    fragmentShader: gBufferCubeMaterial.fragmentShader,
});

// --- Scene Objects (with original materials for display) ---
const cube = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshPhongMaterial({ color: 0xff0000, reflectivity: 0.0 }));
cube.position.y = 1;
scene.add(cube);

const plane = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshPhongMaterial({ color: 0xcccccc, reflectivity: 1.0, specular: 0xffffff, shininess: 100 }));
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

// --- Screen quad for post-processing display ---
const postScene = new THREE.Scene();
const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const postMaterial = new THREE.RawShaderMaterial({
    uniforms: {
        tColor: { value: gBuffer.texture[0] },
        tNormal: { value: gBuffer.texture[1] },
        tReflectivity: { value: gBuffer.texture[2] },
    },
    vertexShader: `
        in vec3 position;
        in vec2 uv;
        out vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        precision highp float;
        uniform sampler2D tColor;
        uniform sampler2D tNormal;
        uniform sampler2D tReflectivity;
        in vec2 vUv;
        out vec4 fragColor;
        void main() {
            vec3 reflectivity = texture(tReflectivity, vUv).rgb;
            if (reflectivity.r > 0.0) { // Check if reflectivity is non-zero
                fragColor = vec4(reflectivity, 1.0); // Display reflectivity
            } else {
                fragColor = vec4(texture(tColor, vUv).rgb, 1.0); // Display color
            }
        }
    `,
    glslVersion: THREE.GLSL3
});

const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial);
postScene.add(quad);

// --- Render Loop ---
function animate() {
    requestAnimationFrame(animate);

    // --- Pass 1: Render G-buffer ---
    const originalCubeMaterial = cube.material;
    const originalPlaneMaterial = plane.material;
    cube.material = gBufferCubeMaterial;
    plane.material = gBufferPlaneMaterial;

    renderer.setRenderTarget(gBuffer);
    renderer.clear();
    renderer.render(scene, camera);

    cube.material = originalCubeMaterial;
    plane.material = originalPlaneMaterial;

    // --- Pass 2: Render to screen ---
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCamera);

    controls.update();
}

animate();

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    gBuffer.setSize(window.innerWidth, window.innerHeight);
});
