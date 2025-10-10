const ssrVertexShader = `
    precision highp float;

    in vec3 position;
    in vec3 normal;
    in vec2 uv;

    out vec3 vNormal;
    out vec2 vUv;
    out vec4 vPosition;

    uniform mat4 modelMatrix;
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;

    void main() {
        vNormal = (modelMatrix * vec4(normal, 0.0)).xyz;
        vUv = uv;
        vPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;


/*
vertexShader: `
        in vec3 position;
        void main() {
            gl_Position = vec4(position, 1.0);
        }
    `,
*/

const gBufferVertexShader = `
    precision highp float;
    in vec3 position;
    in vec3 normal;
    uniform mat4 normalMatrix;
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    out vec3 vNormal;
    void main() {
        vNormal = (normalMatrix * vec4(normal, 0.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;


export {ssrVertexShader};