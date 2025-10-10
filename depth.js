import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- SHADERS (Minimal) ---

// G-buffer Vertex Shader (writes normals to buffer)
const gBufferVertexShader = `
    #version 300 es
    precision highp float;
    in vec3 position;
    in vec3 normal;
    uniform mat4 normalMatrix;
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    out vec3 vNormal;
    void main() {
        vNormal = (normalMatrix * vec4(normal, 0.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

// G-buffer Fragment Shader (packs normals)
const gBufferFragmentShader = `
    #version 300 es
    precision highp float;
    in vec3 vNormal;
    layout(location = 0) out vec4 gBufferOutput;
    void main() {
        gBufferOutput.rgb = normalize(vNormal) * 0.5 + 0.5;
        gBufferOutput.a = 1.0; 
    }
`;

// Post-processing Vertex Shader (fullscreen quad)
const quadVertexShader = `
    #version 300 es
    in vec3 position;
    void main() {
        gl_Position = vec4(position, 1.0);
    }
`;

// SSR Fragment Shader (combines lighting and reflections)
const ssrFragmentShader = `
    #version 300 es
    precision highp float;

    uniform sampler2D gBufferTexture;
    uniform sampler2D depthBuffer;
    uniform sampler2D finalSceneTexture; // For sampling the previous pass

    uniform mat4 inverseProjectionMatrix;
    uniform mat4 inverseViewMatrix;

    out vec4 fragColor;

    vec3 reconstructPosition(vec2 uv, float z) {
        float x = uv.x * 2.0 - 1.0;
        float y = uv.y * 2.0 - 1.0;
        vec4 position_s = vec4(x, y, z, 1.0);
        vec4 position_v = inverseProjectionMatrix * position_s;
        position_v.xyz /= position_v.w;
        vec4 position_w = inverseViewMatrix * position_v;
        return position_w.xyz;
    }

    void main() {
        vec2 uv = gl_FragCoord.xy / vec2(textureSize(gBufferTexture, 0));
        vec4 gBufferData = texture(gBufferTexture, uv);
        vec3 normal = gBufferData.rgb * 2.0 - 1.0;
        float depth = texture(depthBuffer, uv).r;
        vec4 baseColor = texture(finalSceneTexture, uv);
        
        if (depth == 1.0 || normal.y < 0.5) {
            fragColor = baseColor;
            return;
        }

        vec3 position = reconstructPosition(uv, depth);
        vec3 viewDir = normalize(position - vec3(inverseViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)));
        vec3 reflectedRay = reflect(viewDir, normal);
        
        vec4 reflectionColor = vec4(0.0);
        vec2 hitUV = uv;
        float stepSize = 0.01;
        float maxSteps = 50.0;
        for (float i = 0.0; i < maxSteps; i++) {
            vec3 p = position + reflectedRay * (i * stepSize);
            vec4 projectedPos = projectionMatrix * inverseViewMatrix * vec4(p, 1.0);
            projectedPos.xyz /= projectedPos.w;
            vec2 projectedUV = projectedPos.xy * 0.5 + 0.5;

            if (projectedUV.x < 0.0 || projectedUV.x > 1.0 || projectedUV.y < 0.0 || projectedUV.y > 1.0) break;

            float hitDepth = texture(depthBuffer, projectedUV).r;
            if (projectedPos.z * 0.5 + 0.5 < hitDepth) {
                reflectionColor = texture(finalSceneTexture, projectedUV);
                break;
            }
        }
        
        float fresnel = pow(1.0 - max(0.0, dot(normal, viewDir)), 5.0);
        vec3 finalColor = mix(baseColor.rgb, reflectionColor.rgb, fresnel * reflectionColor.a);
        fragColor = vec4(finalColor, 1.0);
    }
`;

// --- THREE.JS SETUP ---

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 5, 10);
const controls = new OrbitControls(camera, renderer.domElement);

const gBufferScene = new THREE.Scene();
const postProcessScene = new THREE.Scene();

// --- RENDER TARGETS ---

const resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
const mainRenderTarget = new THREE.WebGLRenderTarget(resolution.x, resolution.y, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
});

const depthTexture = new THREE.DepthTexture(resolution.x, resolution.y);
depthTexture.type = THREE.UnsignedIntType;
mainRenderTarget.depthTexture = depthTexture;

// --- MATERIALS ---

const gBufferMaterial = new THREE.RawShaderMaterial({
    vertexShader: gBufferVertexShader,
    fragmentShader: gBufferFragmentShader,
    uniforms: {
        normalMatrix: { value: new THREE.Matrix3() },
        modelViewMatrix: { value: new THREE.Matrix4() },
        projectionMatrix: { value: new THREE.Matrix4() },
    },
});

const ssrMaterial = new THREE.RawShaderMaterial({
    vertexShader: quadVertexShader,
    fragmentShader: ssrFragmentShader,
    uniforms: {
        gBufferTexture: { value: mainRenderTarget.texture },
        depthBuffer: { value: mainRenderTarget.depthTexture },
        finalSceneTexture: { value: mainRenderTarget.texture },
        inverseProjectionMatrix: { value: new THREE.Matrix4() },
        inverseViewMatrix: { value: new THREE.Matrix4() },
    },
});

// --- GEOMETRY ---

const plane = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), gBufferMaterial);
plane.rotation.x = -Math.PI / 2;
gBufferScene.add(plane);

const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), gBufferMaterial);
sphere.position.y = 1;
gBufferScene.add(sphere);

const postProcessQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ssrMaterial);
postProcessScene.add(postProcessQuad);

// --- ANIMATION LOOP ---

function animate() {
    requestAnimationFrame(animate);
    controls.update();

    // 1. G-buffer Pass: Render normals and depth
    renderer.setRenderTarget(mainRenderTarget);
    renderer.render(gBufferScene, camera);

    // 2. SSR Pass: Render to screen using the buffers
    renderer.setRenderTarget(null);
    ssrMaterial.uniforms.inverseProjectionMatrix.value.copy(camera.projectionMatrix).invert();
    ssrMaterial.uniforms.inverseViewMatrix.value.copy(camera.matrixWorld);
    renderer.render(postProcessScene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    mainRenderTarget.setSize(window.innerWidth, window.innerHeight);
});
