const gBufferFragmentShader = `
    precision highp float;

    uniform vec3 uColor;
    uniform float uReflectivity;

    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec3 vViewPosition;

    layout(location = 0) out vec4 gColor;
    layout(location = 1) out vec4 gNormal;
    layout(location = 2) out vec4 gPosition;
    layout(location = 3) out float gReflection;

    void main() {
        gColor = vec4(uColor, 1.0);
        gNormal = vec4(normalize(vNormal), 1.0);
        gPosition = vec4(vWorldPosition, 1.0);
        gReflection = uReflectivity;
    }
`;

export {gBufferFragmentShader};