
import * as THREE from 'three'

function addSkyBox(renderer, skyboxScene) {
    const cubeUrls = [
      'https://threejs.org/examples/textures/cube/Park3Med/px.jpg', // +X
      'https://threejs.org/examples/textures/cube/Park3Med/nx.jpg', // -X
      'https://threejs.org/examples/textures/cube/Park3Med/py.jpg', // +Y
      'https://threejs.org/examples/textures/cube/Park3Med/ny.jpg', // -Y
      'https://threejs.org/examples/textures/cube/Park3Med/pz.jpg', // +Z
      'https://threejs.org/examples/textures/cube/Park3Med/nz.jpg'  // -Z
    ];
    
    const cubeLoader = new THREE.CubeTextureLoader();
    if (cubeLoader.setCrossOrigin) cubeLoader.setCrossOrigin('anonymous');
    
    const skyboxTexture = cubeLoader.load(
      cubeUrls,
      () => console.log('[skybox] Successfully loaded'),
      (progress) => console.log('[skybox] Loading progress:', progress),
      (err) => console.error('[skybox] Failed to load:', err)
    );
    // Correct cube texture color space
    if ('SRGBColorSpace' in THREE) {
    skyboxTexture.colorSpace = THREE.SRGBColorSpace;
    } else if ('sRGBEncoding' in THREE) {
    skyboxTexture.encoding = THREE.sRGBEncoding;
    }

    // Use Three.js built-in cube shader for skybox
    const skyboxMaterial = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(THREE.ShaderLib.cube.uniforms),
    vertexShader: THREE.ShaderLib.cube.vertexShader,
    fragmentShader: THREE.ShaderLib.cube.fragmentShader,
    side: THREE.BackSide,
    depthWrite: false
    });
    skyboxMaterial.uniforms.tCube.value = skyboxTexture;

    // Large cube for skybox background
    const skyboxGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
    const skyboxMesh = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
    skyboxScene.add(skyboxMesh);

    // Follow camera position to keep skybox around camera
    skyboxMesh.onBeforeRender = function (renderer, _scene, cam) {
    this.position.copy(cam.position);
    };
}

export {addSkyBox}