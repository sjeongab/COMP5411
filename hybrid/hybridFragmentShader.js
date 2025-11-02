const hybridFragmentShader = `
        #include <packing>

        precision highp float;

        uniform sampler2D gColor;
        uniform sampler2D gNormal;
        uniform sampler2D gPosition;
        uniform sampler2D gReflection;
        uniform sampler2D gDepth;
        uniform vec2 resolution;

        uniform mat4 projectionMatrix;
        uniform mat4 inverseProjectionMatrix;
        uniform mat4 inverseViewMatrix;
        uniform mat4 reflectionMatrix;
        uniform vec3 cameraWorldPosition;
        uniform float cameraNear;
        uniform float cameraFar;

        out vec4 FragColor;

        void main() {
            vec2 uv = gl_FragCoord.xy / resolution;
            vec3 albedo = texture(gColor, uv).rgb;
            vec3 normal = texture(gNormal, uv).xyz;
            vec3 position = texture(gPosition, uv).xyz;

            FragColor = vec4(albedo, 1.0);

            return;
        }
    `;

export {hybridFragmentShader};
