const gBufferVertexShader = `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec3 vViewPosition;
    varying vec3 FragPos;

    void main() {
        vec3 vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        //vec4 pos4 = (modelMatrix * vec4(position, 1.0));
        //vec3 vWorldPosition = vec3(pos4.xyz/pos4.w);
        vViewPosition  = (modelViewMatrix * vec4(position, 1.0)).xyz;
        vNormal        = normalMatrix * normal;
        gl_Position    = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export {gBufferVertexShader}