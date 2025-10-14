const ssrFragmentShader = `
        precision highp float;

    uniform sampler2D gBufferTexture;
    uniform sampler2D depthBuffer;
    uniform sampler2D finalSceneTexture; // For sampling the previous pass

    uniform mat4 inverseProjectionMatrix;
    uniform mat4 inverseViewMatrix;

    out vec4 fragColor;

    vec3 reconstructPosition(vec2 uv, float z) {
        float x = uv.x * 2.0 - 1.0;
        float y = uv.y * 2.0 - 1.0;
        vec4 position_s = vec4(x, y, z, 1.0);
        vec4 position_v = inverseProjectionMatrix * position_s;
        position_v.xyz /= position_v.w;
        vec4 position_w = inverseViewMatrix * position_v;
        return position_w.xyz;
    }

    void main() {
        vec2 uv = gl_FragCoord.xy / vec2(textureSize(gBufferTexture, 0));
        vec4 gBufferData = texture(gBufferTexture, uv);
        vec3 normal = gBufferData.rgb * 2.0 - 1.0;
        float depth = texture(depthBuffer, uv).r;
        vec4 baseColor = texture(finalSceneTexture, uv);
        
        if (depth == 1.0 || normal.y < 0.5) {
            fragColor = baseColor;
            return;
        }

        vec3 position = reconstructPosition(uv, depth);
        vec3 viewDir = normalize(position - vec3(inverseViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)));
        vec3 reflectedRay = reflect(viewDir, normal);
        
        vec4 reflectionColor = vec4(0.0);
        vec2 hitUV = uv;
        float stepSize = 0.01;
        float maxSteps = 50.0;
        for (float i = 0.0; i < maxSteps; i++) {
            vec3 p = position + reflectedRay * (i * stepSize);
            vec4 projectedPos = inverseViewMatrix * vec4(p, 1.0);//inverseProjectionMatrix * inverseViewMatrix * vec4(p, 1.0);
            projectedPos.xyz /= projectedPos.w;
            vec2 projectedUV = projectedPos.xy * 0.5 + 0.5;

            if (projectedUV.x < 0.0 || projectedUV.x > 1.0 || projectedUV.y < 0.0 || projectedUV.y > 1.0) break;

            float hitDepth = texture(depthBuffer, projectedUV).r;
            if (projectedPos.z * 0.5 + 0.5 < hitDepth) {
                reflectionColor = texture(finalSceneTexture, projectedUV);
                break;
            }
        }
        
        float fresnel = pow(1.0 - max(0.0, dot(normal, viewDir)), 5.0);
        vec3 finalColor = mix(baseColor.rgb, reflectionColor.rgb, fresnel * reflectionColor.a);
        fragColor = vec4(finalColor, 1.0);
    }
`;

export {ssrFragmentShader};