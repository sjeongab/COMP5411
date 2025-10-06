import * as THREE from 'three'

function addCube(scene, config) {
    const cubeGeometry = new THREE.BoxGeometry(config.scale, config.scale, config.scale);
    const cubeMaterial = new THREE.MeshPhongMaterial({ color: config.color });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.set(...config.position);
    scene.add(cube);
}

export{addCube};