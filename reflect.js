import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls'

// 1. Scene and renderer setup (same as before)
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create the sphere and plane
const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
const sphereMaterial = new THREE.MeshStandardMaterial({ color: 0x8080ff });
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
sphere.position.y = 1;
scene.add(sphere);

const planeGeometry = new THREE.PlaneGeometry(10, 10);
const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

// Add lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
dirLight.position.set(0, 10, 5);
scene.add(dirLight);

camera.position.set(0, 3, 5);
camera.lookAt(0, 0, 0);




// 2. Create the G-buffer using WebGLRenderTarget with the 'count' option
const size = renderer.getSize(new THREE.Vector2());

const depthTexture = new THREE.DepthTexture(size.width, size.height);
depthTexture.format = THREE.DepthFormat;
depthTexture.type = THREE.UnsignedIntType;


const mrt = new THREE.WebGLRenderTarget(size.width, size.height, {
    count: 4, // Enable multiple render targets
    format: THREE.RGBAFormat,
    type: THREE.FloatType, // Use FloatType for higher precision
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: true,
    depthTexture: depthTexture,
});

// Create and assign texture names to make them easier to access later
mrt.textures[0].name = 'gColor';
mrt.textures[1].name = 'gNormal';
mrt.textures[2].name = 'gPosition';
mrt.textures[3].name = 'gReflection';

const [gColorTexture, gNormalTexture, gPositionTexture, gReflectionTexture] = mrt.textures;
gColorTexture.name = 'gColor';
gNormalTexture.name = 'gNormal';
gPositionTexture.name = 'gPosition';
gReflectionTexture.name = 'gReflection';

// 3. Create the G-buffer and SSR materials (shaders are the same)
const gbufferMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uColor: { value: new THREE.Color(0xffffff) },
    },
    vertexShader: /* glsl */ `
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
    fragmentShader: /* glsl */ `
        precision highp float;

        uniform vec3 uColor;
        uniform float uReflectivity;

        in vec3 vNormal;
        in vec3 vWorldPosition;
        in vec3 vViewPosition;

        layout(location = 0) out vec4 gColor;
        layout(location = 1) out vec4 gNormal;
        layout(location = 2) out vec4 gPosition;
        layout(location = 3) out float gReflection;

        void main() {
            gColor = vec4(uColor, 1.0);
            gNormal = vec4(normalize(vNormal), 1.0);
            gPosition = vec4(vWorldPosition, 1.0);
            gReflection = uReflectivity;
        }
    `,
    glslVersion: THREE.GLSL3,
});

// Corrected matrix initialization
const inverseProjectionMatrix = new THREE.Matrix4();

const ssrMaterial = new THREE.ShaderMaterial({
    uniforms: {
        gColor: { value: gColorTexture }, 
        gNormal: { value: gNormalTexture },
        gPosition: { value: gPositionTexture },
        gReflection: {value: gReflectionTexture},
        gDepth: {value: mrt.depthTexture},
        resolution: { value: new THREE.Vector2(size.width, size.height) },
        projectionMatrix: { value: camera.projectionMatrix },
        inverseProjectionMatrix: { value: inverseProjectionMatrix },
        inverseViewMatrix: { value: new THREE.Matrix4() },
        cameraWorldPosition: { value: new THREE.Vector3() },
        viewPosition: { value: camera.position },
        cameraNear: { value: camera.near }, // Add these uniforms for linear depth calculation
        cameraFar: { value: camera.far }
    },
    vertexShader: /* glsl */ `
        void main() {
            gl_Position = vec4(position, 1.0);
        }
    `,
    fragmentShader: /* glsl */ `
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

            // Helper function to reconstruct world space position from depth
            vec3 getWorldPosition(vec2 uv, float depth) {
                // Get clip space position from UVs
                vec4 clipPosition;
                clipPosition.xy = uv * 2.0 - 1.0;
                clipPosition.z = depth * 2.0 - 1.0;
                clipPosition.w = 1.0;

                // Unproject to world space
                vec4 worldPosition = inverseProjectionMatrix * clipPosition;
                worldPosition /= worldPosition.w;

                return worldPosition.xyz;
            }

            void main() {
                vec2 uv = gl_FragCoord.xy / resolution;
                
                // Read properties from the G-buffer
                vec3 position = texture(gPosition, uv).xyz;
                vec3 normal = texture(gNormal, uv).xyz;
                vec3 albedo = texture(gColor, uv).rgb;
                float reflective = texture(gReflection, uv).r;

                // Don't calculate SSR for non-reflective pixels
                if (reflective < 0.5) {
                    FragColor = vec4(albedo, 1.0);
                    return;
                }
                
                vec3 reflectedColor = vec3(0.0);
                float reflectionStrength = 0.0;
                
                vec3 viewDir = normalize(position - cameraWorldPosition);
                vec3 reflectionVector = reflect(viewDir, normal);
                
                vec3 rayOrigin = position;
                vec3 rayDir = reflectionVector;
                
                float stepSize = 0.1;
                int maxSteps = 10;
                
                for (int i = 0; i < maxSteps; i++) {
                    // Project ray point to screen space
                    vec3 rayPointWorld = rayOrigin + rayDir * stepSize * float(i);
                    vec4 projCoord = projectionMatrix * inverseViewMatrix * vec4(rayPointWorld, 1.0);
                    vec2 screenCoord = (projCoord.xy / projCoord.w) * 0.5 + 0.5;

                    // Check if screen coordinates are outside the viewport
                    if (screenCoord.x < 0.0 || screenCoord.x > 1.0 ||
                        screenCoord.y < 0.0 || screenCoord.y > 1.0) {
                        break;
                    }
                    
                    // Sample depth buffer at the projected screen coordinate
                    float sampledDepthRaw = texture(gDepth, screenCoord).x;

                    // Reconstruct world position from sampled depth
                    vec3 sampledWorldPosition = getWorldPosition(screenCoord, sampledDepthRaw);

                    // Check for intersection with the sampled geometry
                    // Compare the ray's step position with the sampled world position
                    if (distance(rayPointWorld, sampledWorldPosition) < 8.0) { // A small tolerance is needed
                        // Intersection detected! Sample the G-buffer at the intersection point
                        //reflectedColor = texture(gColor, screenCoord).rgb;
                        reflectedColor = reflectionVector;
                        reflectionStrength = 1.0;
                        break;
                    }
                        reflectedColor = reflectionVector;
                        reflectionStrength = 1.0;
                }
                
                FragColor = vec4(mix(albedo, reflectedColor, reflectionStrength), 1.0);
            }
        `,
    glslVersion: THREE.GLSL3,
});

const sphereGbufferMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uColor: { value: new THREE.Color(0x8080ff) },
        uReflectivity: {value: 0.0},
    },
    // Same vertex and fragment shader as before
    vertexShader: gbufferMaterial.vertexShader,
    fragmentShader: gbufferMaterial.fragmentShader,
    glslVersion:THREE.GLSL3,
});

const planeGbufferMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uColor: { value: new THREE.Color(0xcccccc) },
        uReflectivity: {value: 1.0},
    },
    // Same vertex and fragment shader as before
    vertexShader: gbufferMaterial.vertexShader,
    fragmentShader: gbufferMaterial.fragmentShader,
    glslVersion: THREE.GLSL3,
});


// 4. Post-processing setup
const postScene = new THREE.Scene();
const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ssrMaterial);
postScene.add(postQuad);

sphere.material = sphereGbufferMaterial;
sphere.material.uniforms.uColor.value = new THREE.Color(0x8080ff);

// 5. Render loop
function animate() {
    requestAnimationFrame(animate);

    // Update the inverse projection matrix every frame, as it might change
    inverseProjectionMatrix.copy(camera.projectionMatrix).invert();

    // Pass 1: Render scene to MRT
    renderer.setRenderTarget(mrt);
    renderer.clear();
    
    // Use the G-buffer material to write to the targets
   
    plane.material = planeGbufferMaterial;
    plane.material.uniforms.uColor.value = new THREE.Color(0xcccccc);
    
    renderer.render(scene, camera);

    // Pass 2: Render post-processing quad with SSR effect
    renderer.setRenderTarget(null);
    //renderer.clear();
    renderer.render(postScene, camera);
}

animate();
