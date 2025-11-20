const ssrAveragedFragmentShader = `
        #include <packing>

        precision highp float;

        uniform sampler2D gColor;
        uniform sampler2D gNormal;
        uniform sampler2D gPosition;
        uniform sampler2D gReflection;
        uniform sampler2D gDepth;
        uniform vec2 resolution;

        uniform vec3 lightDir;
        uniform vec3 lightColor;

        uniform vec3 cameraPos;
        uniform mat4 viewProj;
        uniform mat4 invViewProj; // Inverse view-projection matrix for ray direction

        uniform mat4  uCamMatrix;

        struct Ray {
            vec3 origin;
            vec3 dir;
        };
        
        struct Sphere {
            vec3 position;
            float radius;
            vec3 color;
            float reflectivity;
            vec3 specular;
            float shininess;
        };

        struct Box {
            vec3 position;
            float scale;
            vec3 color;
            float reflectivity;
            vec3 specular;
            float shininess;
        };

        struct Plane{
            vec3 position;
            vec3 normal;
            float offset;
            vec3 color;
            float reflectivity;
            float scale;
            vec3 specular;
            float shininess;
        };


        uniform Sphere spheres[5];
        uniform Box boxes[3];
        uniform Plane planes[1];

        layout(location = 0) out vec4 FragColor; // Add this to fix GL_INVALID_OPERATION error

        vec2 worldToUV(vec3 worldPos) {
            // Transform to clip space
            vec4 clip = viewProj * vec4(worldPos, 1.0);
            // Alternative if using viewProj: vec4 clip = viewProj * vec4(worldPos, 1.0);
            
            // Perspective divide to NDC [-1,1]
            vec3 ndc = clip.xyz / clip.w;
            
            // Check if point is in front of camera (optional: discard invalid)
            if (ndc.z < -1.0 || ndc.z > 1.0) {
                return vec2(-1.0); // Invalid (behind camera or out of range); handle in caller (e.g., skip sampling)
            }
            
            // Map to UV [0,1] (bottom-left origin)
            vec2 uv = ndc.xy * 0.5 + 0.5;
            
            // Clamp to [0,1] to avoid out-of-bounds sampling
            uv = clamp(uv, 0.0, 1.0);
            
            // Optional: Flip y for top-left origin (e.g., some UI systems)
            // uv.y = 1.0 - uv.y;
            
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

        float intersect(vec3 pos, out vec3 hitColor, out float hitReflectivity, out vec3 hitSpec, out float hitShin) {
            float minDist = 1e10;
            hitColor = vec3(0.0);
            hitReflectivity = 0.0;

            for (int i = 0; i < 5; i++) {
                float d = intersectSphere(pos, spheres[i].position, spheres[i].radius);
                if (d < minDist){
                    minDist = d;
                    hitColor = spheres[i].color;
                    hitReflectivity = spheres[i].reflectivity;
                    hitSpec = spheres[i].specular;
                    hitShin = spheres[i].shininess;
                }
            }
            for (int i=0; i < 3; i++){
                float d = intersectBox(pos, boxes[i].position, boxes[i].scale);
                if (d < minDist){
                    minDist = d;
                    hitColor = boxes[i].color;
                    hitReflectivity = boxes[i].reflectivity;
                    hitSpec = boxes[i].specular;
                    hitShin = boxes[i].shininess;
                }
            }

            float d = intersectPlane(pos, planes[0].position, planes[0].scale);
            if (d < minDist){
                minDist = d;
                hitColor = planes[0].color;
                hitReflectivity = planes[0].reflectivity;
                hitSpec = planes[0].specular;
                hitShin = planes[0].shininess;
            }


            return minDist;
        }

        vec4 rayMarch(vec3 origin, vec3 direction) {
            vec3 finalColor = vec3(0.0);
            vec3 rayOrigin = origin;
            vec3 rayDir = direction;
            float attenuation = 1.0;
            const int maxBounces = 2;

            for(int bounce = 0; bounce < maxBounces; bounce++){
                float t = 0.0;
                bool hit = false;
                vec3 hitPos = vec3(0.0);
                vec3 hitColor = vec3(0.0);
                float hitRefl = 0.0;
                vec3 hitSpec = vec3(0.0);
                float hitShin = 0.0;
                for (int i = 0; i < 128; i++){
                    vec3 pos = rayOrigin + t * rayDir;
                    float d = intersect(pos, hitColor, hitRefl, hitSpec, hitShin);
                    if (d < 0.01){
                        hitPos = pos;
                        hit = true;
                        break;
                    }
                    t += d;
                    if (t > 500.0) break;
                }
                if (!hit){
                    if(bounce == 0){
                        vec2 uv = worldToUV(hitPos);
                        finalColor = texture2D(gColor, uv).rgb;
                        return vec4(finalColor, 0.0);
                    }
                    
                    
                }
                else{
                    vec2 uv = worldToUV(hitPos);
                    hitColor = averageColor(gColor, uv); // Use averaged color to smooth artifacts
                    hitRefl = texture2D(gReflection, uv).r; // If artifacts in refl, use averageColor(gReflection, uv).r
                    
                    finalColor = mix(finalColor, hitColor, attenuation);
                    attenuation *= hitRefl;

                    vec3 normal = texture2D(gNormal, uv).rgb; // If artifacts in specular, use averageColor(gNormal, uv).rgb

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
        vec2 suv = gl_FragCoord.xy / resolution;
        vec4 rayClip = vec4(uv, -1.0, 1.0);
        vec4 rayEye = invViewProj * rayClip;
        rayEye.xyz /= rayEye.w;
        rayEye = vec4(rayEye.xy, -1.0, 0.0);
        vec3 rayDir = normalize((uCamMatrix * vec4(rayEye.xyz, 0.0)).xyz);

        vec4 result = rayMarch(cameraPos, rayDir);
        FragColor = result;
    }
`;

export {ssrAveragedFragmentShader};