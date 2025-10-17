import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';

// 1. Scene and renderer setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // Enable shadow mapping
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
document.body.appendChild(renderer.domElement);
camera.position.set(0, 3, 5);

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0,0,0);
controls.camera = camera;
controls.maxDistance = 100;
controls.minDistance = 10;
//camera.lookAt(0, 0, 0);
controls.update();

// Create the sphere and plane with shadow support
const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
const sphereMaterial = new THREE.MeshStandardMaterial({ color: 0x8080ff });
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
sphere.position.y = 1;
sphere.castShadow = true; // Enable shadow casting
sphere.receiveShadow = false;
scene.add(sphere);

const planeGeometry = new THREE.PlaneGeometry(10, 10);
const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.7 });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
plane.receiveShadow = true; // Enable shadow receiving
scene.add(plane);

// Add lighting with shadow support
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
dirLight.position.set(0, 10, 5);
dirLight.castShadow = true; // Enable shadow casting
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 20;
scene.add(dirLight);

// 2. Create the G-buffer using WebGLRenderTarget
const size = renderer.getSize(new THREE.Vector2());
const depthTexture = new THREE.DepthTexture(size.width, size.height);
depthTexture.format = THREE.DepthFormat;
depthTexture.type = THREE.UnsignedIntType;

const mrt = new THREE.WebGLRenderTarget(size.width, size.height, {
    count: 4, // Enable multiple render targets
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: true,
    depthTexture: depthTexture,
});

// Assign texture names
mrt.textures[0].name = 'gColor';
mrt.textures[1].name = 'gNormal';
mrt.textures[2].name = 'gPosition';
mrt.textures[3].name = 'gReflection';
const [gColorTexture, gNormalTexture, gPositionTexture, gReflectionTexture] = mrt.textures;

// 3. Create the G-buffer material
const gbufferMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uColor: { value: new THREE.Color(0xffffff) },
        uReflectivity: { value: 0.0 },
    },
    vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying vec3 vViewPosition;

        void main() {
            vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
            vViewPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        precision highp float;

        uniform vec3 uColor;
        uniform float uReflectivity;

        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying vec3 vViewPosition;

        layout(location = 0) out vec4 gColor;
        layout(location = 1) out vec4 gNormal;
        layout(location = 2) out vec4 gPosition;
        layout(location = 3) out vec4 gReflection;

        void main() {
            gColor = vec4(uColor, 1.0);
            gNormal = vec4(normalize(vNormal), 1.0);
            gPosition = vec4(vWorldPosition, 1.0);
            gReflection = vec4(vec3(uReflectivity), 1.0);
        }
    `,
    glslVersion: THREE.GLSL3,
});

// 4. Create SSR material with improved ray marching
const ssrMaterial = new THREE.ShaderMaterial({
    uniforms: {
        gColor: { value: gColorTexture },
        gNormal: { value: gNormalTexture },
        gPosition: { value: gPositionTexture },
        gReflection: { value: gReflectionTexture },
        gDepth: { value: depthTexture },
        resolution: { value: new THREE.Vector2(size.width, size.height) },
        projectionMatrix: { value: camera.projectionMatrix },
        inverseProjectionMatrix: { value: new THREE.Matrix4() },
        inverseViewMatrix: { value: new THREE.Matrix4() },
        cameraWorldPosition: { value: controls.camera.position },
        cameraNear: { value: camera.near },
        cameraFar: { value: camera.far },
    },
    vertexShader: `
        void main() {
            gl_Position = vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        #include <packing>

        precision highp float;

        uniform sampler2D gColor;
        uniform sampler2D gNormal;
        uniform sampler2D gPosition;
        uniform sampler2D gReflection;
        uniform sampler2D gDepth;
        uniform vec2 resolution;
        uniform mat4 projectionMatrix;
        uniform mat4 inverseProjectionMatrix;
        uniform mat4 inverseViewMatrix;
        uniform vec3 cameraWorldPosition;
        uniform float cameraNear;
        uniform float cameraFar;

        out vec4 FragColor;

        float linearDepth(float depthSample) {
            float z = depthSample * 2.0 - 1.0;
            return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - z * (cameraFar - cameraNear));
        }

        void main() {
            vec2 uv = gl_FragCoord.xy / resolution;
            vec3 albedo = texture(gColor, uv).rgb;
            vec3 normal = texture(gNormal, uv).xyz;
            vec3 position = texture(gPosition, uv).xyz;
            float reflectivity = texture(gReflection, uv).r;
            float depth = texture(gDepth, uv).r;
            float linearDepthSample = linearDepth(depth);

            if (reflectivity > 0.0) {
                FragColor = vec4(albedo, 1.0);
                return;
            }else{
                FragColor = vec4(1.0, 0.0, 0.0, 1.0);
                return;
            }

            vec3 viewDir = normalize(cameraWorldPosition - position);
            vec3 reflectionDir = reflect(-viewDir, normal);
            vec3 rayOrigin = position;
            vec3 rayDir = reflectionDir;
            vec3 currentPos = rayOrigin;
            vec4 reflectionColor = vec4(0.0);

            float stepSize = 0.1;
            int maxSteps = 50;

            for (int i = 0; i < maxSteps; i++) {
                currentPos += rayDir * stepSize;
                vec4 currentClip = projectionMatrix * inverseViewMatrix * vec4(currentPos, 1.0);
                currentClip /= currentClip.w;
                vec2 currentUV = (currentClip.xy + 1.0) / 2.0;
                float sampledDepth = texture(gDepth, currentUV).r;
                float linearSampledDepth = linearDepth(sampledDepth);

                if (currentUV.x < 0.0 || currentUV.x > 1.0 || currentUV.y < 0.0 || currentUV.y > 1.0) break;

                float depthDiff = linearSampledDepth - linearDepthSample;
                if (abs(depthDiff) < 1.0) { // Intersection threshold
                    //reflectionColor = vec4(texture(gColor, currentUV).rgb, 1.0);
                    //reflectionColor = vec4(1.0, 0.0, 0.0, 1.0);
                    reflectionColor = vec4(albedo, 1.0);
                    break;
                }
            }

            FragColor = mix(vec4(albedo, 1.0), reflectionColor, reflectivity);
        }
    `,
    glslVersion: THREE.GLSL3,
});

// 5. Post-processing setup
const postScene = new THREE.Scene();
const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ssrMaterial);
postScene.add(postQuad);

sphere.material = gbufferMaterial;
sphere.material.uniforms.uColor.value = new THREE.Color(0x8080ff);
sphere.material.uniforms.uReflectivity.value = 0.0; // Non-reflective sphere
plane.material = gbufferMaterial;
plane.material.uniforms.uColor.value = new THREE.Color(0xcccccc);
plane.material.uniforms.uReflectivity.value = 1.0; // Reflective plane

// 6. Render loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    console.log(controls.camera.position);
    // Update matrices
    ssrMaterial.uniforms.inverseProjectionMatrix.value.copy(camera.projectionMatrix).invert();
    ssrMaterial.uniforms.inverseViewMatrix.value.copy(camera.matrixWorldInverse).invert();
    ssrMaterial.uniforms.cameraWorldPosition.value.copy(camera.position);

    // Pass 1: Render to G-buffer
    renderer.setRenderTarget(mrt);
    renderer.clear();
    renderer.render(scene, camera);

    // Pass 2: Render post-processing quad with SSR
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCamera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    mrt.setSize(window.innerWidth, window.innerHeight);
    ssrMaterial.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
});