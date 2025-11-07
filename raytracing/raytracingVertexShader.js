// raytracingVertexShader.js

// برای glslVersion: THREE.GLSL3 باید ورودی position را تعریف کنیم
const raytracingVertexShader = `

void main() {
    gl_Position = vec4(position, 1.0);
}
`;

export { raytracingVertexShader };
