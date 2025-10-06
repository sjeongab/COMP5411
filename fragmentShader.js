const fragmentShaderSource = `
precision mediump float;

in vec3 vNormal;
out vec4 fragColor;

void main() {
    fragColor = vec4(vNormal * 0.5 + 0.5, 1.0); // Transform normal to [0, 1] range
}
`

export {fragmentShaderSource}