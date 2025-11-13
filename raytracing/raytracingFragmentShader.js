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

// --------- SDF ها ----------
float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float sdBox(vec3 p, vec3 b) {
    vec3 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
}

// صحنه: کمترین فاصله + رنگ/رفلکت
float mapScene(vec3 pos, out vec3 hitColor, out float hitReflectivity, out vec3 hitSpec, out float hitShin) {
    float minDist = 1e10;
    hitColor = vec3(0.0);
    hitReflectivity = 0.0;

    // spheres
    for (int i = 0; i < 5; i++) {
        float d = sdSphere(pos - spheres[i].position, spheres[i].radius);
        if (d < minDist) {
            minDist = d;
            hitColor = spheres[i].color;
            hitReflectivity = spheres[i].reflectivity;
            hitSpec = spheres[i].specular;
            hitShin = spheres[i].shininess;
        }
    }

    // boxes
    for (int i = 0; i < 3; i++) {
        float d = sdBox(pos - boxes[i].position, vec3(boxes[i].scale * 0.5));
        if (d < minDist) {
            minDist = d;
            hitColor = boxes[i].color;
            hitReflectivity = boxes[i].reflectivity;
            hitSpec = boxes[i].specular;
            hitShin = boxes[i].shininess;
        }
    }

    // plane به صورت باکس خیلی نازک بزرگ
    {
        vec3 halfSize = vec3(planes[0].scale * 0.5, 0.01, planes[0].scale * 0.5);
        float d = sdBox(pos - planes[0].position, halfSize);
        if (d < minDist) {
            minDist = d;
            hitColor = planes[0].color;
            hitReflectivity = planes[0].reflectivity;
            hitSpec = planes[0].specular;
            hitShin = planes[0].shininess;
        }
    }

    return minDist;
}

// تخمین نرمال با مشتق عددی روی SDF
vec3 estimateNormal(vec3 pos) {
    vec3 dummyColor;
    float dummyRefl;
    vec3 dummySpec;
    float dummyShin;
    const float eps = 0.001;

    float dx = mapScene(pos + vec3(eps, 0.0, 0.0), dummyColor, dummyRefl, dummySpec, dummyShin)
             - mapScene(pos - vec3(eps, 0.0, 0.0), dummyColor, dummyRefl, dummySpec, dummyShin);
    float dy = mapScene(pos + vec3(0.0, eps, 0.0), dummyColor, dummyRefl, dummySpec, dummyShin)
             - mapScene(pos - vec3(0.0, eps, 0.0), dummyColor, dummyRefl, dummySpec, dummyShin);
    float dz = mapScene(pos + vec3(0.0, 0.0, eps), dummyColor, dummyRefl, dummySpec, dummyShin)
             - mapScene(pos - vec3(0.0, 0.0, eps), dummyColor, dummyRefl, dummySpec, dummyShin);

    return normalize(vec3(dx, dy, dz));
}

// --------- Ray Marching ----------
vec4 rayMarch(vec3 origin, vec3 dir) {
    vec3 col = vec3(0.0);
    vec3 ro = origin;
    vec3 rd = dir;
    float attenuation = 1.0;

    const int MAX_BOUNCES = 3;
    const int MAX_STEPS = 128;
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
            vec3 p = ro + rd * t;
            float d = mapScene(p, hitColor, hitRefl, hitSpec, hitShin);
            if (d < SURF_EPS) {
                hit = true;
                hitPos = p;
                break;
            }
            t += d;
            if (t > MAX_DIST) break;
        }

        if (!hit) {
            if(bounce==0){
                return vec4(0.0);
            }
            col += vec3(0.25098, 0.25098, 0.25098) * attenuation; // پس‌زمینه
            break;
        }

        vec3 n = estimateNormal(hitPos);
        vec3 L = normalize(lightDir);

        // diffuse + ambient
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

        ro = hitPos + n * 0.01;
        rd = reflect(rd, n);
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

    vec3 ro = cameraPos;
    vec3 rd = normalize(worldFar.xyz - ro);

    vec4 color = rayMarch(ro, rd);
    FragColor = color;//vec4(color, 1.0);
}
`;

export { raytracingFragmentShader };
