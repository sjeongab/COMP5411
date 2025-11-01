const planeFragmentShader = `
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
            float reflection = texture(gReflection, uv).r;

            vec4 reflClip = reflectionMatrix * vec4(position, 1.0);
            vec3 ndc = reflClip.xyz / reflClip.w;
            vec2 refluv = ndc.xy * 0.5 + 0.5;
            refluv.y = -refluv.y;

            refluv = clamp(refluv, 0.0, 1.0);
            vec3 reflectionColor = texture(gColor, refluv).rgb;

            //vec3 viewDir = normalize(vViewPosition - vWorldPosition);
            if(reflection == 0.8){
            FragColor = vec4(reflectionColor, 1.0);
            }
            else{
                FragColor = vec4(albedo, 1.0);
            }
            return;
        }
`
;

export {planeFragmentShader};