import * as THREE from 'three'

function addPlane(scene, config) {
    const planeGeometry = new THREE.PlaneGeometry(150, 150); // Width, Height
    const planeMaterial = new THREE.MeshPhongMaterial({ color: 0x222222, side: THREE.DoubleSide, reflectivity: 1});
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotateX(-Math.PI/2);
    scene.add(plane); 
    reflections.push(plane);
}

export{addCube};