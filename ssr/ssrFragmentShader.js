const ssrFragmentShader = `
    precision highp float;

    layout(location = 0) out vec4 gColour;

    in vec3 vNormal;
    in vec2 vUv;
    in vec4 vPosition;

    void main() {
        gColour = vec4(1.0, 0.0, 0.0, 1.0);
    }
`;

export {ssrFragmentShader};