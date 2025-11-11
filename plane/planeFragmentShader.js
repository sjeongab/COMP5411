const planeFragmentShader = `
precision highp float;

in vec3 vWorldPos;
in vec3 vWorldNormal;

uniform vec3 cameraPos;
uniform vec3 lightDir;
uniform vec3 lightColor;

uniform vec3 planeColor;
uniform float planeReflectivity;

uniform mat4 uViewProjectionMatrix;
uniform vec2 resolution;
uniform sampler2D gColor;


struct Sphere {
    vec3 position;
    float radius;
    vec3 color;
};

struct Box {
    vec3 position;
    float scale;
    vec3 color;
};

uniform Sphere spheres[5];
uniform Box boxes[3];

out vec4 FragColor;

// ---------- SDF ----------
float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float sdBox(vec3 p, vec3 b) {
    vec3 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
}

// Calculate distance for different objects
float mapScene(vec3 pos, out vec3 hitColor) {
    float minDist = 1e10;
    hitColor = vec3(0.0);

    // Spheres
    for (int i = 0; i < 5; i++) {
        float d = sdSphere(pos - spheres[i].position, spheres[i].radius);
        if (d < minDist) {
            minDist = d;
            hitColor = spheres[i].color;
        }
    }

    // Boxes
    for (int i = 0; i < 3; i++) {
        float d = sdBox(pos - boxes[i].position, vec3(boxes[i].scale * 0.5));
        if (d < minDist) {
            minDist = d;
            hitColor = boxes[i].color;
        }
    }

    return minDist;
}

// Calculate surface normal
vec3 estimateNormal(vec3 pos) {
    vec3 dummyColor;
    const float eps = 0.001;

    float dx = mapScene(pos + vec3(eps, 0.0, 0.0), dummyColor)
             - mapScene(pos - vec3(eps, 0.0, 0.0), dummyColor);
    float dy = mapScene(pos + vec3(0.0, eps, 0.0), dummyColor)
             - mapScene(pos - vec3(0.0, eps, 0.0), dummyColor);
    float dz = mapScene(pos + vec3(0.0, 0.0, eps), dummyColor)
             - mapScene(pos - vec3(0.0, 0.0, eps), dummyColor);

    return normalize(vec3(dx, dy, dz));
}

// Calculate reflection
vec3 traceReflection(vec3 origin, vec3 dir) {
    const int MAX_STEPS = 128;
    const float MAX_DIST = 500.0;
    const float SURF_EPS = 0.001;

    float t = 0.0;
    bool hit = false;
    vec3 hitPos = vec3(0.0);
    vec3 hitColor = vec3(0.0);

    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = origin + dir * t;
        float d = mapScene(p, hitColor);
        if (d < SURF_EPS) {
            vec4 clipSpace = uViewProjectionMatrix * vec4(p, 1.0);
            vec3 ndc = clipSpace.xyz / clipSpace.w;
            vec2 screenSpaceXY = (ndc.xy * 0.5 + 0.5);
            hitColor = texture2D(gColor, screenSpaceXY).rgb;
            hit = true;
            hitPos = p;
            break;
        }
        t += d;
        if (t > MAX_DIST) break;
    }

    if (!hit) {
        // Dark background
        return vec3(0.0);
    }

    vec3 n = estimateNormal(hitPos);
    vec3 L = normalize(lightDir);

    float diff = max(dot(n, L), 0.0);
    vec3 col = hitColor * (0.1 + diff * lightColor);


    return col;
}

void main() {
    vec3 N = normalize(vWorldNormal);

    // View direction from point to camera
    vec3 V = normalize(cameraPos - vWorldPos);

    // Reflection ray direction (reflection of incoming ray from camera)
    vec3 R = reflect(-V, N);

    // Small offset to avoid self-intersection
    vec3 reflColor = traceReflection(vWorldPos + N * 0.01, normalize(R));

    // Simple diffuse for the plane itself
    float diff = max(dot(N, normalize(lightDir)), 0.0);
    vec3 base = planeColor * (0.1 + diff * lightColor) + vec3(0.25098, 0.25098, 0.25098);

    vec3 finalColor = base*(1.0-planeReflectivity)+reflColor*planeReflectivity;

    FragColor = vec4(finalColor, 1.0);
}
`;

export { planeFragmentShader };
