import {addCube} from './cube.js'
import {addSphere} from './sphere.js'

const objects = [
      { type: 'cube', position: [-4.0, 0.4, 1.0], scale: 1, rotationSpeed: 0, color: 0xaaeedd },
      { type: 'sphere', position: [-2.5, 0.6, 1.0], scale: 0.6, rotationSpeed: 0.8, color: [0.5, 1.0, 0.5, 1.0] },
      { type: 'sphere', position: [-1.0, 0.8, 1.0], scale: 0.8, rotationSpeed: 1.2, color: [0.5, 0.5, 1.0, 1.0] },
      { type: 'sphere', position: [0, 1.0, 2.0], scale: 1.0, rotationSpeed: -1.0, color: [1.0, 1.0, 0.5, 1.0] },
      { type: 'cube', position: [1.5, 0.5, 2.0], scale: 0.5, rotationSpeed: 0, color: [0.5, 1.0, 1.0, 1.0] },
      // Additional shapes
      { type: 'sphere', position: [3.0, 0.7, 1.5], scale: 0.7, rotationSpeed: 0.9, color: [1.0, 0.8, 0.2, 1.0] },
      { type: 'cube', position: [4.5, 0.9, 1.5], scale: 0.9, rotationSpeed: 0, color: [0.2, 0.5, 1.0, 1.0] },
      { type: 'sphere', position: [-3.5, 0.3, 3.0], scale: 0.3, rotationSpeed: 1.5, color: [0.8, 0.2, 0.8, 1.0] },
];

function addObjects(scene) {
    objects.forEach((object) => {
        if (object.type == 'cube'){
            addCube(scene, object);
        }
        else{
            addSphere(scene, object);
        }
    });
}

export {addObjects};

