import * as THREE from 'three'
import {gBufferMaterial} from '../gBuffer/gBuffer.js'

function addSphere(scene, config) {
    var sphereGeometry = new THREE.SphereGeometry(config.scale, 32, 16);
    var sphereMaterial = new THREE.MeshPhongMaterial({ color: config.color, reflectivity: 0 });
    var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(...config.position);
    scene.add(sphere);
}

export{addSphere};