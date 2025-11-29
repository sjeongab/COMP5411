const ssrAveragedFragmentShader = `
        #include <packing>

        precision highp float;

        uniform sampler2D gColor;
        uniform sampler2D gNormal;
        uniform sampler2D gPosition;
        uniform sampler2D gReflection;
        uniform sampler2D gShininess;
        uniform sampler2D gSpecular;
        uniform sampler2D gDepth;
        uniform vec2 resolution;

        uniform vec3 lightDir;

        uniform vec3 cameraPos;
        uniform mat4 cameraMatrix;
        uniform mat4 viewProj;
        uniform mat4 invViewProj;


        struct Ray {
            vec3 origin;
            vec3 dir;
        };
        
        struct Sphere {
            vec3 position;
            float radius;
        };

        struct Box {
            vec3 position;
            float scale;
        };

        struct Plane{
            vec3 position;
            vec3 normal;
            float offset;
            float scale;
        };


        uniform Sphere spheres[5];
        uniform Box boxes[3];
        uniform Plane planes[1];

        layout(location = 0) out vec4 FragColor;

        vec2 worldToUV(vec3 worldPos) {
            vec4 clip = viewProj * vec4(worldPos, 1.0);

            vec3 ndc = clip.xyz / clip.w;

            if (ndc.z < -1.0 || ndc.z > 1.0) {
                return vec2(-1.0);
            }

            vec2 uv = ndc.xy * 0.5 + 0.5;
            uv = clamp(uv, 0.0, 1.0);
            
            return uv;
        }


        // Gaussian function for weighting (add this for better quality)
        float gaussian(float x, float sigma) {
            return exp(-(x * x) / (2.0 * sigma * sigma));
        }

        // Function for averaging color samples around UV
        vec3 averageColor(sampler2D tex, vec2 centerUv) {
            vec3 sum = vec3(0.0);
            float weightSum = 0.0; // For weighted average
            vec2 texelSize = 1.0 / resolution; // Pixel size

            const int kernelRadius = 1; // Tune this: 1 = 3x3 (default), 2 = 5x5 for more smoothing
            const float offsetScale = 1.0; // Tune this: default 1.0, 1.5 or 2.0 to spread sampling wider (helps with larger artifacts)
            const float sigma = 1.0; // Tune this: for gaussian weighting, larger = more blur (test 0.5-2.0)

            for (int x = -kernelRadius; x <= kernelRadius; x++) {
                for (int y = -kernelRadius; y <= kernelRadius; y++) {
                    vec2 offset = vec2(float(x), float(y)) * texelSize * offsetScale;
                    vec2 sampleUv = clamp(centerUv + offset, 0.0, 1.0);
                    vec3 sampleColor = texture2D(tex, sampleUv).rgb;

                    // Gaussian weight based on distance (set to 1.0 for uniform)
                    float dist = sqrt(float(x*x + y*y));
                    float weight = gaussian(dist, sigma);

                    sum += sampleColor * weight;
                    weightSum += weight;
                }
            }
            return sum / weightSum; // Weighted average
        }

        float intersectSphere(vec3 pos, vec3 center, float radius) {
            return length(pos - center) - radius;
        }

        float intersectBox(vec3 pos, vec3 center, float scale) {
            vec3 dist = abs(pos - center) - scale/2.0;
            return length(max(dist, 0.0)) + min(max(dist.x, max(dist.y, dist.z)), 0.0);
        }

        float intersectPlane(vec3 pos, vec3 center, float scale) {
            vec3 dist = abs(pos - center) - vec3(scale/2.0, 0.01, scale/2.0);
            return length(max(dist, 0.0)) + min(max(dist.x, max(dist.y, dist.z)), 0.0);
        }

        float intersect(vec3 pos) {
            float minDist = 1e10;

            for (int i = 0; i < 5; i++) {
                float d = intersectSphere(pos, spheres[i].position, spheres[i].radius);
                if (d < minDist){
                    minDist = d;
                }
            }
            for (int i=0; i < 3; i++){
                float d = intersectBox(pos, boxes[i].position, boxes[i].scale);
                if (d < minDist){
                    minDist = d;
                }
            }

            float d = intersectPlane(pos, planes[0].position, planes[0].scale);
            if (d < minDist){
                minDist = d;
            }

            return minDist;
        }

        float linearDepth(float z) {
            float zNDC = z * 2.0 - 1.0;
            zNDC = (2.0 * 1.0 * 500.0) / (500.0 + 1.0 - zNDC * (500.0 - 1.0));
            return (zNDC - 1.0) / (500.0 - 1.0);
        }

        bool depthTest(vec3 pos){
            vec2 uv = worldToUV(pos);
            float depth = texture2D(gDepth, uv).r;
            return linearDepth(depth) >= 1.0;
        }

        vec4 rayMarch(vec3 origin, vec3 direction) {
            vec3 finalColor = vec3(0.0);
            vec3 rayOrigin = origin;
            vec3 rayDir = direction;
            float attenuation = 1.0;

            const int MAX_BOUNCES = 2;
            const int MAX_STEPS = 70;
            const float MAX_DIST = 500.0;
            const float SURF_EPS = 0.01;

            for(int bounce = 0; bounce < MAX_BOUNCES; bounce++){
                float t = 0.0;
                bool hit = false;
                vec3 hitPos = vec3(0.0);
                vec3 hitColor = vec3(0.0);
                float hitRefl = 0.0;
                vec3 hitSpec = vec3(0.0);
                float hitShin = 0.0;

                for (int i = 0; i < MAX_STEPS; i++){
                    vec3 pos = rayOrigin + t * rayDir;
                    if(bounce > 0){
                        if (depthTest(pos)){
                            break;
                        }
                    }
                    float d = intersect(pos);
                    if (d < SURF_EPS){
                        hitPos = pos;
                        hit = true;
                        break;
                    }
                    t += d;
                    if (t > MAX_DIST) break;
                }
                if (!hit){
                    if(bounce == 0){
                        return vec4(0.0);
                    }
                }
                else{
                    vec2 uv = worldToUV(hitPos);
                    hitColor = averageColor(gColor, uv);
                    hitRefl = texture2D(gReflection, uv).r;
                    hitShin = texture2D(gShininess, uv).r;
                    hitSpec = texture2D(gSpecular, uv).rgb;
                    
                    finalColor = mix(finalColor, hitColor, attenuation);
                    attenuation *= hitRefl;

                    vec3 normal = texture2D(gNormal, uv).rgb;

                    if(hitShin > 0.0){
                        vec3 viewDir = normalize(cameraPos-hitPos);
                        vec3 reflectDir = reflect(-lightDir, normal);
                        float spec = max(dot(reflectDir, viewDir), 0.0);
                        vec3 specular = pow(spec, hitShin) * hitSpec;
                        finalColor += specular;
                    }

                    if (hitRefl < 0.1) break;

                    
                    rayDir = reflect(rayDir, normal);
                    rayOrigin = hitPos + normal;
                }
                
            }
        finalColor = mix(finalColor, vec3(0.2508), attenuation);

        return vec4(finalColor, 1.0);
    }


    void main() {
        vec2 uv = (gl_FragCoord.xy / resolution) * 2.0 - 1.0;
        vec4 rayClip = vec4(uv, -1.0, 1.0);
        vec4 rayEye = invViewProj * rayClip;
        rayEye.xyz /= rayEye.w;
        rayEye = vec4(rayEye.xy, -1.0, 0.0);
        vec3 rayDir = normalize((cameraMatrix * vec4(rayEye.xyz, 0.0)).xyz);

        vec4 result = rayMarch(cameraPos, rayDir);
        FragColor = result;
    }
`;

export {ssrAveragedFragmentShader};