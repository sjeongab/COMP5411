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
uniform sampler2D gNormal;

uniform mat4 invViewProj;
uniform mat4 uCamMatrix;



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

vec2 worldToUV(vec3 worldPos) {
    // Transform to clip space
    vec4 clip = uViewProjectionMatrix * vec4(worldPos, 1.0);
    
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
    
    return uv;
}

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
vec3 rayMarch(vec3 origin, vec3 dir) {
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
            vec2 uv = worldToUV(p);
            hitColor = texture2D(gColor, uv).rgb;
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

    vec3 col = hitColor;


    return col;
}

void main() {
    vec2 uv = (gl_FragCoord.xy / resolution) * 2.0 - 1.0;
    vec2 suv = gl_FragCoord.xy / resolution;
    vec4 rayClip = vec4(uv, -1.0, 1.0);
    vec4 rayEye = invViewProj * rayClip;
    rayEye.xyz /= rayEye.w;
    rayEye = vec4(rayEye.xy, -1.0, 0.0);
    vec3 rayDir = normalize((uCamMatrix * vec4(rayEye.xyz, 0.0)).xyz);

    vec3 result = rayMarch(cameraPos, rayDir);
    FragColor = vec4(result, 1.0);
}
`;

export { planeFragmentShader };
