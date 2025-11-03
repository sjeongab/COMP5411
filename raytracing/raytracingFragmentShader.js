const raytracingFragmentShader = `
    precision highp float;

    uniform vec3 cameraPos;
    uniform mat4 invViewProj; // Inverse view-projection matrix for ray direction
    uniform vec2 resolution;

    uniform vec3 lightDir;
    uniform vec3 lightColor;
    //uniform vec3 ambientColor;

    uniform mat4  uCamMatrix;
    uniform mat4  uCamPos;
    uniform mat4  uInvProj;

    struct Ray {
        vec3 origin;
        vec3 dir;
    };
    
    struct Sphere {
        vec3 position;
        float radius;
        vec3 color;
        float reflectivity;
    };

    uniform Sphere spheres[2];

    out vec4 FragColor;

    float intersectSphere(vec3 pos, vec3 center, float radius) {
        return length(pos - center) - radius;
    }

    float intersect(vec3 pos, out vec3 hitColor, out float hitReflectivity) {
        float minDist = 1e10;
        hitColor = vec3(0.0);
        hitReflectivity = 0.0;

        for (int i = 0; i < 2; i++) {
            float d = intersectSphere(pos, spheres[i].position, spheres[i].radius);
            if (d < minDist){
                minDist = d;
                hitColor = spheres[i].color;
                hitReflectivity = spheres[i].reflectivity;
                break;
            }
        }

        return minDist;
    }

    vec3 rayMarch(vec3 origin, vec3 direction) {
        float t = 0.0;
        vec3 color = vec3(0.0);
        bool hit = false;
        for (int i = 0; i < 100; i++){
            vec3 pos = origin + t * direction;
            vec3 hitColor;
            float hitReflectivity;
            float d = intersect(pos, hitColor, hitReflectivity);
            if (d < 20.0){
                color = vec3(d/1000.0, hitColor.g, hitColor.b);
                hit = true;
                return color;
            }
            t += 1.0;
            if (t > 500.0) break;
        }
        return vec3(0.2, 0.4, 0.4);
    }


    void main() {
        vec2 uv = (gl_FragCoord.xy / resolution) * 2.0 - 1.0;
        vec4 rayClip = vec4(uv, -1.0, 1.0);
        vec4 rayEye = invViewProj * rayClip;
        rayEye.xyz /= rayEye.w;
        rayEye = vec4(rayEye.xy, -1.0, 0.0);
        vec3 rayDir = normalize((uCamMatrix * vec4(rayEye.xyz, 0.0)).xyz);

        //vec3 rayDir = vec3(0, -0.4244, -0.9053);
        vec3 result = rayMarch(cameraPos, rayClip.xyz);

        FragColor = vec4(result, 1.0);
        //FragColor = vec4(rayDir, 1.0);
    }
`;

export {raytracingFragmentShader};