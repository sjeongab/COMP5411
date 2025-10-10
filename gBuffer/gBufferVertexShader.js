const gBufferVertexShader = `
  precision highp float;

  in vec3 position;
  in vec3 normal;
  
  uniform mat4 normalMatrix;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  
  out vec3 vNormal;
  
  void main() {
      vNormal = (normalMatrix * vec4(normal, 0.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export {gBufferVertexShader}