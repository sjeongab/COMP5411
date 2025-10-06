import * as THREE from 'three'

function addSphere(scene, config) {
    var sphereGeometry = new THREE.SphereGeometry(config.scale, 32, 16);
    var sphereMaterial = new THREE.MeshPhongMaterial({ color: config.color });
    var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(...config.position);
    scene.add(sphere);
}

export{addSphere};