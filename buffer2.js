import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';

// 1) Scene & renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
camera.position.set(0, 3, 5);

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0,0,0);
controls.camera = camera;
controls.maxDistance = 100;
controls.minDistance = 10;
controls.update();

// Sphere & plane
const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
const sphereMaterial = new THREE.MeshStandardMaterial({ color: 0x8080ff });
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
sphere.position.y = 1;
sphere.castShadow = true;
sphere.receiveShadow = false;
scene.add(sphere);

const planeGeometry = new THREE.PlaneGeometry(10, 10);
const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.7 });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
plane.receiveShadow = true;
scene.add(plane);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Move the light further back to illuminate a larger area
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(50, 50, 50); // موقعیت نور جدید
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 100; // افزایش فاصله دورترین نور
scene.add(dirLight);

// 2) G-buffer MRT
const size = renderer.getSize(new THREE.Vector2());
const depthTexture = new THREE.DepthTexture(size.width, size.height);
depthTexture.format = THREE.DepthFormat;
depthTexture.type = THREE.UnsignedIntType;

const mrt = new THREE.WebGLRenderTarget(size.width, size.height, {
  count: 4,
  format: THREE.RGBAFormat,
  type: THREE.FloatType,
  minFilter: THREE.NearestFilter,
  magFilter: THREE.NearestFilter,
  depthBuffer: true,
  depthTexture: depthTexture,
});

mrt.textures[0].name = 'gColor';
mrt.textures[1].name = 'gNormal';
mrt.textures[2].name = 'gPosition';
mrt.textures[3].name = 'gReflection';
const [gColorTexture, gNormalTexture, gPositionTexture, gReflectionTexture] = mrt.textures;

// 3) G-buffer material
const gbufferMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uColor:        { value: new THREE.Color(0xffffff) },
    uReflectivity: { value: 0.0 },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec3 vViewPosition;
    void main() {
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      vViewPosition  = (modelViewMatrix * vec4(position, 1.0)).xyz;
      vNormal        = normalize(normalMatrix * normal);
      gl_Position    = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    precision highp float;
    uniform vec3  uColor;
    uniform float uReflectivity;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec3 vViewPosition;
    layout(location = 0) out vec4 gColor;
    layout(location = 1) out vec4 gNormal;
    layout(location = 2) out vec4 gPosition;
    layout(location = 3) out vec4 gReflection;
    void main() {
      gColor      = vec4(uColor, 1.0);
      gNormal     = vec4(normalize(vNormal), 1.0);
      gPosition   = vec4(vWorldPosition, 1.0);
      gReflection = vec4(vec3(uReflectivity), 1.0);
    }
  `,
  glslVersion: THREE.GLSL3,
});

// 4) SSR material (بدون فرنل و edge-fade و بدون self-hit reject)
const ssrMaterial = new THREE.ShaderMaterial({
  uniforms: {
    gColor:      { value: gColorTexture },
    gNormal:     { value: gNormalTexture },
    gPosition:   { value: gPositionTexture },
    gReflection: { value: gReflectionTexture },
    gDepth:      { value: depthTexture },
    resolution:  { value: new THREE.Vector2(size.width, size.height) },

    projectionMatrix:        { value: camera.projectionMatrix },
    inverseProjectionMatrix: { value: new THREE.Matrix4() },
    inverseViewMatrix:       { value: new THREE.Matrix4() },
    cameraWorldPosition:     { value: controls.camera.position },

    cameraNear: { value: camera.near },
    cameraFar:  { value: camera.far },
  },
  vertexShader: `
    void main() { gl_Position = vec4(position, 1.0); }
  `,
  fragmentShader: `
    #include <packing>
    precision highp float;

    uniform sampler2D gColor, gNormal, gPosition, gReflection, gDepth;
    uniform vec2  resolution;

    uniform mat4  projectionMatrix, inverseViewMatrix;
    uniform vec3  cameraWorldPosition;
    uniform float cameraNear, cameraFar;

    out vec4 FragColor;

    float linearDepth(float depthSample) {
      float z = depthSample * 2.0 - 1.0;
      return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - z * (cameraFar - cameraNear));
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / resolution;

      vec3 albedo        = texture(gColor,    uv).rgb;
      vec3 normal        = normalize(texture(gNormal,   uv).xyz);
      vec3 position      = texture(gPosition, uv).xyz;
      float reflectivity = texture(gReflection, uv).r;

      if (reflectivity <= 0.0) { FragColor = vec4(albedo, 1.0); return; }

      // ۱) Normal Bias
      vec3 viewDir       = normalize(cameraWorldPosition - position);
      vec3 reflectionDir = reflect(-viewDir, normal);
      vec3 rayOrigin     = position + normal * 0.02;
      vec3 rayDir        = normalize(reflectionDir);
      vec3 currentPos    = rayOrigin;

      vec4 reflectionColor = vec4(0.0);
      float stepSize = 0.08;  // ۴) قدم
      int   maxSteps = 50;

      for (int i = 0; i < maxSteps; i++) {
        vec3 prevPos = currentPos;
        currentPos  += rayDir * stepSize;

        // world -> clip -> NDC -> UV
        vec4 clip = projectionMatrix * inverseViewMatrix * vec4(currentPos, 1.0);
        clip /= clip.w;
        vec2 cuv = (clip.xy + 1.0) * 0.5;

        if (cuv.x < 0.0 || cuv.x > 1.0 || cuv.y < 0.0 || cuv.y > 1.0) break;

        float sampledDepth = texture(gDepth, cuv).r;
        if (sampledDepth >= 0.999) break; // ۲) بک‌گراند

        // عمق خطی رِی و صحنه
        float rayDepthNDC      = clip.z * 0.5 + 0.5;
        float linearRayDepth   = linearDepth(rayDepthNDC);
        float linearSceneDepth = linearDepth(sampledDepth);

        // thickness تطبیقی (ریز)
        float distance01 = clamp((linearSceneDepth - cameraNear) / (cameraFar - cameraNear), 0.0, 1.0);
        float thickness  = mix(0.015, 0.045, distance01);
        thickness = max(thickness, stepSize * 0.75);

        if (abs(linearSceneDepth - linearRayDepth) < thickness) {
          // ۵) Binary Search (۴ مرحله)
          vec3 aPos = prevPos, bPos = currentPos;
          vec2 hitUV = cuv;

          for (int j = 0; j < 4; j++) {
            vec3 midPos = 0.5 * (aPos + bPos);
            vec4 mClip = projectionMatrix * inverseViewMatrix * vec4(midPos, 1.0);
            mClip /= mClip.w;
            vec2 mUV = (mClip.xy + 1.0) * 0.5;

            if (mUV.x < 0.0 || mUV.x > 1.0 || mUV.y < 0.0 || mUV.y > 1.0) break;

            float mDepth = texture(gDepth, mUV).r;
            if (mDepth >= 0.999) { aPos = midPos; continue; }

            float mRayDepthNDC    = mClip.z * 0.5 + 0.5;
            float mLinearRayDepth = linearDepth(mRayDepthNDC);
            float mLinearScene    = linearDepth(mDepth);

            float mDist01 = clamp((mLinearScene - cameraNear) / (cameraFar - cameraNear), 0.0, 1.0);
            float mThick  = max(mix(0.015, 0.045, mDist01), stepSize * 0.75);

            if (abs(mLinearScene - mLinearRayDepth) < mThick) { bPos = midPos; hitUV = mUV; }
            else { aPos = midPos; }
          }

          reflectionColor = vec4(texture(gColor, hitUV).rgb, 1.0);
          break;
        }
      }

      // ❌ بدون فرنل/فید
      float mixAmount = clamp(reflectivity, 0.0, 1.0);
      FragColor = mix(vec4(albedo, 1.0), reflectionColor, mixAmount);
    }
  `,
  glslVersion: THREE.GLSL3,
});

// 5) Post-process quad
const postScene = new THREE.Scene();
const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ssrMaterial);
postScene.add(postQuad);

// G-buffer materials
sphere.material = gbufferMaterial;
sphere.material.uniforms.uColor.value = new THREE.Color(0x8080ff);
sphere.material.uniforms.uReflectivity.value = 0.5;

plane.material = gbufferMaterial;
plane.material.uniforms.uColor.value = new THREE.Color(0xcccccc);
plane.material.uniforms.uReflectivity.value = 1.0;

// 6) Loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();

  ssrMaterial.uniforms.inverseProjectionMatrix.value.copy(camera.projectionMatrix).invert();
  ssrMaterial.uniforms.inverseViewMatrix.value.copy(camera.matrixWorldInverse).invert();
  ssrMaterial.uniforms.cameraWorldPosition.value.copy(camera.position);

  // Pass 1: G-buffer
  renderer.setRenderTarget(mrt);
  renderer.clear();
  renderer.render(scene, camera);

  // Pass 2: SSR
  renderer.setRenderTarget(null);
  renderer.render(postScene, postCamera);
}
animate();

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  mrt.setSize(window.innerWidth, window.innerHeight);
  ssrMaterial.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
});
