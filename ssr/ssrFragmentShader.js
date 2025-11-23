const ssrFragmentShader = `
        #include <packing>

        precision highp float;

        uniform sampler2D gColor;
        uniform sampler2D gNormal;
        uniform sampler2D gReflection;
        uniform sampler2D gDepth;

        uniform vec2 resolution;

        uniform vec3 lightDir;

        uniform vec3 cameraPos;
        uniform mat4 viewProj;
        uniform mat4 invViewProj; // Inverse view-projection matrix for ray direction

        uniform mat4  uCamMatrix; // TODO: rename uCamMatrix

        struct Ray {
            vec3 origin;
            vec3 dir;
        };
        
        struct Sphere {
            vec3 position;
            float radius;
            vec3 specular;
            float shininess;
        };

        struct Box {
            vec3 position;
            float scale;
            vec3 specular;
            float shininess;
        };

        struct Plane{
            vec3 position;
            vec3 normal;
            float offset;
            float scale;
            vec3 specular;
            float shininess;
        };


        uniform Sphere spheres[5];
        uniform Box boxes[3];
        uniform Plane planes[1];

        out vec4 FragColor;

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

        float linearDepth(float z, float near, float far) {
            float zNDC = z * 2.0 - 1.0;
            return (2.0 * near * far) / (far + near - zNDC * (far - near));
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

                for (int i = 0; i < 70; i++){
                    vec3 pos = rayOrigin + t * rayDir; //TODO: Primary check at the main
                    if(bounce > 0){
                    vec2 uv = worldToUV(pos);
                    float depth = texture2D(gDepth, uv).r;
                    float linearDepth = linearDepth(depth, 1.0, 500.0);
                    float z = (linearDepth - 1.0) / (500.0 - 1.0);
                    if (z >= 1.0){
                        break;
                    }
                    }
                    float d = intersect(pos, hitColor, hitRefl, hitSpec, hitShin);
                    if (d < 0.001){
                        hitPos = pos;
                        hit = true;
                        break;
                    }
                    t += d;
                    if (t > 500.0) break;
                }
                if (!hit){
                    if(bounce == 0){
                        return vec4(0.0, 0.0, 0.0, 0.0);
                    }
                }
                else{
                    vec2 uv = worldToUV(hitPos);
                    hitColor = texture2D(gColor, uv).rgb;
                    hitRefl = texture2D(gReflection, uv).r;
                    
                    finalColor = mix(finalColor, hitColor, attenuation);
                    attenuation *= hitRefl;

                    vec3 normal = texture2D(gNormal, uv).rgb;

                    if(hitShin > 0.0){ //import hitShin from gBuffer?
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
        vec3 rayDir = normalize((uCamMatrix * vec4(rayEye.xyz, 0.0)).xyz);

        vec4 result = rayMarch(cameraPos, rayDir);


        vec2 suv = gl_FragCoord.xy / resolution;
        float depth = texture2D(gDepth, suv).r;
        float linearDepth = linearDepth(depth, 1.0, 500.0);
        float z = (linearDepth - 1.0) / (500.0 - 1.0);
        
        FragColor = result;
        //depth = 500.0 / (500.0 - depth * 499.0);
        //FragColor= vec4(z, 0.0, 0.0, 1.0);
    }
`;

export {ssrFragmentShader};
