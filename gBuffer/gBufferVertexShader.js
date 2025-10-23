const gBufferVertexShader = `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec3 vViewPosition;
    varying vec3 FragPos;

    void main() {
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        vViewPosition  = (modelViewMatrix * vec4(position, 1.0)).xyz;
        vNormal        = normalize(normalMatrix * normal);
        gl_Position    = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export {gBufferVertexShader}