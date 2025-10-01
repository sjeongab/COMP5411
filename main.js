//import {Shader} from "./shader.js";
//import {Buffer} from "./buffer.js";
import {parseOBJ} from "./loadObj.js"

const fpsElem = document.querySelector("#fps");

function render(gl, buffer, shader, then){
  function rotate(now) {
    now *= 0.001; 
    const deltaTime = now - then;          // compute time since last frame
    then = now;                            // remember time for next frame
    const fps = 1 / deltaTime;             // compute frames per second
    if (fpsElem) fpsElem.textContent = fps.toFixed(1);
    draw(gl, buffer, shader, now);
    requestAnimationFrame(rotate);
  }
  requestAnimationFrame(rotate);
}

async function main() {
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  const canvas = document.querySelector("#canvas");
  const gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }

  const vs = `
  attribute vec4 a_position;
  attribute vec3 a_normal;

  uniform mat4 u_projection;
  uniform mat4 u_view;
  uniform mat4 u_world;

  varying vec3 v_normal;

  void main() {
    gl_Position = u_projection * u_view * u_world * a_position;
    v_normal = mat3(u_world) * a_normal;
  }
  `;

  const fs = `
  precision mediump float;

  varying vec3 v_normal;

  uniform vec4 u_diffuse;
  uniform vec3 u_lightDirection;

  void main () {
    vec3 normal = normalize(v_normal);
    float fakeLight = dot(u_lightDirection, normal) * .5 + .5;
    gl_FragColor = vec4(u_diffuse.rgb * fakeLight, u_diffuse.a);
  }
  `;

  // compiles and links the shaders, looks up attribute and uniform locations
  const meshProgramInfo = webglUtils.createProgramInfo(gl, [vs, fs]);

  // Load cube from OBJ
  const response = await fetch('https://webglfundamentals.org/webgl/resources/models/cube/cube.obj');  
  const text = await response.text();
  const cubeData = parseOBJ(text);
  const cubeBufferInfo = webglUtils.createBufferInfoFromArrays(gl, cubeData);

  // Sphere geometry (with radius 1, scaled later)
  function createSphereData(radius = 1.0, latBands = 24, longBands = 32) {
    const positions = [], normals = [], texcoords = [], indices = [];
    for (let lat = 0; lat <= latBands; ++lat) {
      const theta = lat * Math.PI / latBands;
      const sT = Math.sin(theta), cT = Math.cos(theta);
      for (let lon = 0; lon <= longBands; ++lon) {
        const phi = lon * 2 * Math.PI / longBands;
        const sP = Math.sin(phi), cP = Math.cos(phi);
        const x = cP * sT, y = cT, z = sP * sT;
        positions.push(radius * x, radius * y, radius * z);
        normals.push(x, y, z);
        texcoords.push(lon / longBands, lat / latBands);
      }
    }
    for (let lat = 0; lat < latBands; ++lat) {
      for (let lon = 0; lon < longBands; ++lon) {
        const i = lat * (longBands + 1) + lon;
        const j = i + longBands + 1;
        indices.push(i, j, i + 1, j, j + 1, i + 1);
      }
    }
    return {
      position: { numComponents: 3, data: new Float32Array(positions) },
      normal:   { numComponents: 3, data: new Float32Array(normals)   },
      texcoord: { numComponents: 2, data: new Float32Array(texcoords) },
      indices:  new Uint16Array(indices),
    };
  }

  // Base sphere geometry
  const sphereArrays = createSphereData(1.0, 24, 32);
  const sphereBufferInfo = webglUtils.createBufferInfoFromArrays(gl, sphereArrays);

  // Flat plane geometry (floor)
  function createPlaneData(size = 10) {
    const positions = [
      -size, 0, -size,
      -size, 0, size,
      size, 0, -size,
      size, 0, size,
    ];
    const normals = [
      0, 1, 0,
      0, 1, 0,
      0, 1, 0,
      0, 1, 0,
    ];
    const texcoords = [
      0, 0,
      0, 1,
      1, 0,
      1, 1,
    ];
    const indices = [0, 1, 2, 2, 1, 3];
    return {
      position: { numComponents: 3, data: new Float32Array(positions) },
      normal:   { numComponents: 3, data: new Float32Array(normals)   },
      texcoord: { numComponents: 2, data: new Float32Array(texcoords) },
      indices:  new Uint16Array(indices),
    };
  }

  const planeArrays = createPlaneData(10);
  const planeBufferInfo = webglUtils.createBufferInfoFromArrays(gl, planeArrays);

  const cameraTarget = [0, 1, 0];
  let distance = 6;
  let yaw = 0;
  let pitch = 20;
  let isDragging = false;
  let previousMouseX = 0;
  let previousMouseY = 0;

  // Mouse events for camera rotation
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMouseX = e.clientX;
    previousMouseY = e.clientY;
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - previousMouseX;
    const deltaY = e.clientY - previousMouseY;
    yaw += deltaX * 0.5; // rotation sensitivity
    pitch -= deltaY * 0.5;
    pitch = Math.max(-89, Math.min(89, pitch)); // limit pitch to avoid flipping
    previousMouseX = e.clientX;
    previousMouseY = e.clientY;
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Mouse wheel event for zoom
  canvas.addEventListener('wheel', (e) => {
    distance += e.deltaY * 0.01;
    distance = Math.max(0.1, distance);
    e.preventDefault();
  });

  const zNear = 0.1;
  const zFar = 50;

  function degToRad(deg) {
    return deg * Math.PI / 180;
  }

  // Normalized light direction (without m4.normalize dependency)
  function norm3(v){ const l=Math.hypot(v[0],v[1],v[2])||1; return [v[0]/l,v[1]/l,v[2]/l]; }
  const lightDir = norm3([-1,3,5]);

  function render(time) {
    time *= 0.001;  // convert to seconds

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    // Clear each frame
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const fieldOfViewRadians = degToRad(60);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projection = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

    // Calculate camera position based on yaw and pitch
    const cameraPosition = [
      distance * Math.sin(degToRad(yaw)) * Math.cos(degToRad(pitch)),
      distance * Math.sin(degToRad(pitch)),
      distance * Math.cos(degToRad(yaw)) * Math.cos(degToRad(pitch)),
    ];

    const up = [0, 1, 0];
    const camera = m4.lookAt(cameraPosition, cameraTarget, up);
    const view = m4.inverse(camera);

    const sharedUniforms = {
      u_lightDirection: lightDir,
      u_view: view,
      u_projection: projection,
    };

    gl.useProgram(meshProgramInfo.program);

    // calls gl.uniform
    webglUtils.setUniforms(meshProgramInfo, sharedUniforms);

    // Draw flat plane (floor)
    webglUtils.setBuffersAndAttributes(gl, meshProgramInfo, planeBufferInfo);
    let planeWorld = m4.translation(0, 0, 0); // floor at y=0
    webglUtils.setUniforms(meshProgramInfo, {
      u_world: planeWorld,
      u_diffuse: [0.8, 0.8, 0.8, 1.0], // gray color for floor
    });
    webglUtils.drawBufferInfo(gl, planeBufferInfo);

    // Object settings with positions adjusted to sit on the surface, sizes and different colors
    // y = scale for sitting on the surface (assuming half-height = scale)
    // Distances increased
    const objects = [
      { type: 'cube', position: [-4.0, 0.4, -2.0], scale: 0.4, rotationSpeed: 0, color: [1.0, 0.5, 0.5, 1.0] },
      { type: 'sphere', position: [-2.5, 0.6, 1.0], scale: 0.6, rotationSpeed: 0.8, color: [0.5, 1.0, 0.5, 1.0] },
      { type: 'sphere', position: [-1.0, 0.8, -1.0], scale: 0.8, rotationSpeed: 1.2, color: [0.5, 0.5, 1.0, 1.0] },
      { type: 'sphere', position: [0, 1.0, 2.0], scale: 1.0, rotationSpeed: -1.0, color: [1.0, 1.0, 0.5, 1.0] },
      { type: 'cube', position: [1.5, 0.5, -2.0], scale: 0.5, rotationSpeed: 0, color: [0.5, 1.0, 1.0, 1.0] },
      // Additional shapes
      { type: 'sphere', position: [3.0, 0.7, 1.5], scale: 0.7, rotationSpeed: 0.9, color: [1.0, 0.8, 0.2, 1.0] },
      { type: 'cube', position: [4.5, 0.9, -1.5], scale: 0.9, rotationSpeed: 0, color: [0.2, 0.5, 1.0, 1.0] },
      { type: 'sphere', position: [-3.5, 0.3, 3.0], scale: 0.3, rotationSpeed: 1.5, color: [0.8, 0.2, 0.8, 1.0] },
    ];

    // Draw each object
    objects.forEach((obj) => {
      const bufferInfo = obj.type === 'cube' ? cubeBufferInfo : sphereBufferInfo;
      webglUtils.setBuffersAndAttributes(gl, meshProgramInfo, bufferInfo);
      let world = m4.translation(...obj.position);
      world = m4.multiply(world, m4.yRotation(time * obj.rotationSpeed));
      world = m4.scale(world, obj.scale, obj.scale, obj.scale);
      webglUtils.setUniforms(meshProgramInfo, {
        u_world: world,
        u_diffuse: obj.color,
      });
      webglUtils.drawBufferInfo(gl, bufferInfo);
    });

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

main().catch((err) => {
    console.log(err);
});
