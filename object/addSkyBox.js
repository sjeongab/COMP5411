
import * as THREE from 'three'

function addSkyBox(scene) {
    const cubeLoader = new THREE.CubeTextureLoader();
    const skyboxTexture = cubeLoader.load([
    'https://threejs.org/examples/textures/cube/Park3Med/px.jpg',
    'https://threejs.org/examples/textures/cube/Park3Med/nx.jpg',
    'https://threejs.org/examples/textures/cube/Park3Med/py.jpg',
    'https://threejs.org/examples/textures/cube/Park3Med/ny.jpg',
    'https://threejs.org/examples/textures/cube/Park3Med/pz.jpg',
    'https://threejs.org/examples/textures/cube/Park3Med/nz.jpg'
    ]);
    scene.background = skyboxTexture;
    scene.environment = skyboxTexture;
}

export {addSkyBox}