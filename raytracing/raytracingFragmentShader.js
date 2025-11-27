// raytracingFragmentShader.js
const raytracingFragmentShader = `
precision highp float;

uniform vec3 cameraPos;
uniform mat4 invViewProj;
uniform vec2 resolution;

uniform vec3 lightDir;
uniform vec3 lightColor;

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

struct Plane {
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

out vec4 FragColor;

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

        vec3 estimateNormal(vec3 pos){
            vec3 dummyColor;
            float dummyRefl;
            vec3 dummyNorm;
            vec3 dummySpec;
            float dummyShin;
            const float eps = 0.01;
            return normalize(vec3(
            intersect(pos + vec3(eps, 0.0, 0.0), dummyColor, dummyRefl, dummySpec, dummyShin) - intersect(pos - vec3(eps, 0.0, 0.0), dummyColor, dummyRefl, dummySpec, dummyShin),
            intersect(pos + vec3(0.0, eps, 0.0), dummyColor, dummyRefl, dummySpec, dummyShin) - intersect(pos - vec3(0.0, eps, 0.0), dummyColor, dummyRefl, dummySpec, dummyShin),
            intersect(pos + vec3(0.0, 0.0, eps), dummyColor, dummyRefl, dummySpec, dummyShin) - intersect(pos - vec3(0.0, 0.0, eps), dummyColor, dummyRefl, dummySpec, dummyShin)
            ));
        }

        vec4 rayMarch(vec3 origin, vec3 dir) {
            vec3 col = vec3(0.0);
            vec3 rayOrigin = origin;
            vec3 rayDir = dir;
            float attenuation = 1.0;

            const int MAX_BOUNCES = 5;
            const int MAX_STEPS = 70;
            const float MAX_DIST = 500.0;
            const float SURF_EPS = 0.001;

            for (int bounce = 0; bounce < MAX_BOUNCES; bounce++) {
                float t = 0.0;
                bool hit = false;
                vec3 hitPos = vec3(0.0);
                vec3 hitColor = vec3(0.0);
                float hitRefl = 0.0;
                vec3 hitSpec = vec3(0.0);
                float hitShin = 0.0;

                for (int i = 0; i < MAX_STEPS; i++) {
                    vec3 p = rayOrigin + rayDir * t;
                    float d = intersect(p, hitColor, hitRefl, hitSpec, hitShin);
                    if (d < SURF_EPS) {
                        hit = true;
                        hitPos = p;
                        break;
                    }
                    t += d;
                    if (t > MAX_DIST) break;
                }
                if(!hit){
                    if(bounce==0){
                        return vec4(0.0);
                    }
                    col += vec3(0.2598) * attenuation;
                    break;
                }

                vec3 n = estimateNormal(hitPos);
                vec3 L = normalize(lightDir);

                float diff = max(dot(n, L), 0.0);
                vec3 lighting = hitColor * (0.1 + diff * lightColor);

                if(hitShin > 0.0){
                    vec3 V = normalize(cameraPos - hitPos);
                    vec3 R = reflect(-L, n);
                    float spec = pow(max(dot(R, V), 0.0), hitShin);
                    lighting += hitSpec * spec;   
                }

                col += lighting * attenuation * (1.0 - hitRefl);
                if (hitRefl <= 0.05) break;

                rayOrigin = hitPos + n * 0.01;
                rayDir = reflect(rayDir, n);
                attenuation *= hitRefl;
            }
            return vec4(col, 1.0);
        }

void main() {
    vec2 ndc = (gl_FragCoord.xy / resolution) * 2.0 - 1.0;

    vec4 clipNear = vec4(ndc, -1.0, 1.0);
    vec4 clipFar  = vec4(ndc,  1.0, 1.0);

    vec4 worldNear = invViewProj * clipNear;
    vec4 worldFar  = invViewProj * clipFar;

    worldNear /= worldNear.w;
    worldFar  /= worldFar.w;

    vec3 rayOrigin = cameraPos;
    vec3 rayDir = normalize(worldFar.xyz - rayOrigin);

    vec4 color = rayMarch(rayOrigin, rayDir);
    FragColor = color;
}
`;

export { raytracingFragmentShader };
