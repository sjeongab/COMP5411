const gBufferFragmentShader = `
    precision highp float;

    in vec3 vNormal;

    layout(location = 0) out vec4 gBufferOutput;

    void main() {
        gBufferOutput.rgb = normalize(vNormal) * 0.5 + 0.5;
        gBufferOutput.a = 1.0; 
    }
`;

export {gBufferFragmentShader};