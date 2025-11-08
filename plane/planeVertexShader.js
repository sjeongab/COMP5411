// plane/planeVertexShader.js
const planeVertexShader = `
precision highp float;




out vec3 vWorldPos;
out vec3 vWorldNormal;

void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export { planeVertexShader };
