const vertexShaderSource = `
layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;

out vec3 vNormal;

void main() {
    vNormal = normalize(normal);
    gl_Position = vec4(position, 1.0);
}
`

export {vertexShaderSource}