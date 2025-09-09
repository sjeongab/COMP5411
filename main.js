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
    fpsElem.textContent = fps.toFixed(1);
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

  const response = await fetch('https://webglfundamentals.org/webgl/resources/models/cube/cube.obj');  
  const text = await response.text();
  const data = parseOBJ(text);

  // Because data is just named arrays like this
  //
  // {
  //   position: [...],
  //   texcoord: [...],
  //   normal: [...],
  // }
  //
  // and because those names match the attributes in our vertex
  // shader we can pass it directly into `createBufferInfoFromArrays`
  // from the article "less code more fun".

  // create a buffer for each array by calling
  // gl.createBuffer, gl.bindBuffer, gl.bufferData
  const bufferInfo = webglUtils.createBufferInfoFromArrays(gl, data);

  const cameraTarget = [0, 0, 0];
  const cameraPosition = [0, 0, 4];
  const zNear = 0.1;
  const zFar = 50;

  function degToRad(deg) {
    return deg * Math.PI / 180;
  }

  function render(time) {
    time *= 0.001;  // convert to seconds

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    const fieldOfViewRadians = degToRad(60);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projection = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

    const up = [0, 1, 0];
    // Compute the camera's matrix using look at.
    const camera = m4.lookAt(cameraPosition, cameraTarget, up);

    // Make a view matrix from the camera matrix.
    const view = m4.inverse(camera);

    const sharedUniforms = {
      u_lightDirection: m4.normalize([-1, 3, 5]),
      u_view: view,
      u_projection: projection,
    };

    gl.useProgram(meshProgramInfo.program);

    // calls gl.uniform
    webglUtils.setUniforms(meshProgramInfo, sharedUniforms);

    // calls gl.bindBuffer, gl.enableVertexAttribArray, gl.vertexAttribPointer
    webglUtils.setBuffersAndAttributes(gl, meshProgramInfo, bufferInfo);

    // calls gl.uniform
    webglUtils.setUniforms(meshProgramInfo, {
      u_world: m4.yRotation(time),
      u_diffuse: [1, 0.7, 0.5, 1],
    });

    // calls gl.drawArrays or gl.drawElements
    webglUtils.drawBufferInfo(gl, bufferInfo);

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

main().catch((err) => {
    console.log(err);
});