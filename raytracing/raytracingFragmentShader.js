const raytracingFragmentShader = `
    precision highp float;

    uniform vec3 cameraPos;
    //uniform vec3 cameraDir;
    uniform vec2 resolution;
    uniform mat4 invViewProj; // Inverse view-projection matrix for ray direction

    uniform vec3 lightDir;
    uniform vec3 lightColor;
    uniform vec3 ambientColor;

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
        return abs(length(pos - center) - radius);
    }

    float intersect(vec3 pos, vec3 hitColor, out float hitReflectivity) {
        float minDist = 1e10;
        hitColor = vec3(0.0);
        hitReflectivity = 0.0;

        for (int i = 0; i < 2; i++) {
            float d = intersectSphere(pos, spheres[i].position, spheres[i].radius);
            if (d < 100.0 && d < minDist){
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
            if (d < 10.0){
                color = hitColor;
                hit = true;
            }
            t += 1.0;
            if (hit || t > 100.0) {
                color = vec3(d+0.5, 0.0, 0.0);
                break;
            }
        }
        return color;
    }


    void main() {
        vec2 uv = (gl_FragCoord.xy / resolution) * 2.0 - 1.0;
        vec4 rayClip = vec4(uv, -1.0, 1.0);
        vec4 rayEye = invViewProj * rayClip;
        rayEye = vec4(rayEye.xy, -1.0, 0.0);
        vec3 rayDir = normalize(rayEye.xyz);

        vec3 rayOrigin = cameraPos;

        vec3 result = rayMarch(rayOrigin, rayDir);

        FragColor = vec4(result, 1.0);
    }
`;

export {raytracingFragmentShader};