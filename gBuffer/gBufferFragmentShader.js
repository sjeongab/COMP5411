const gBufferFragmentShader = `
    precision highp float;

    uniform vec3 uColor;
    uniform float uReflectivity;
    uniform float uShininess;
    uniform vec3 uSpecular;

    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec3 vViewPosition;

    layout(location = 0) out vec4 gColor;
    layout(location = 1) out vec4 gNormal;
    layout(location = 2) out float gReflection;

    void main() {
        vec3 lightPos = vec3(5, 10, 7);

        vec3 ambientColor = vec3(0.25098, 0.25098, 0.25098); // TODO: import ambientColor as uniform
        vec3 ambient = ambientColor*uColor;

        vec3 normal = normalize(vNormal);

        
        vec3 lightDirection = normalize(lightPos - vWorldPosition);
        float diff = max(dot(normal, lightDirection), 0.0);
        vec3 diffuse = uColor * diff;

        vec3 final = (ambient + diffuse);
        gColor = vec4(final, 1.0);
        gNormal = vec4(normal, 1.0);
        gReflection = uReflectivity;
    }
`;

export {gBufferFragmentShader};