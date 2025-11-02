`
const float MAX_DIST = 1000.0;
const float EPSILON = 0.001;
const int MAX_REFLECTIONS = 1; // Limit recursion depth



struct Hit {
    bool hit;
    vec3 point;
    vec3 normal;
    vec3 color;
    float reflectivity;
};

// Ray-sphere intersection
bool intersectSphere(Ray ray, vec3 center, float radius, out float t) {
    vec3 oc = ray.origin - center;
    float a = dot(ray.dir, ray.dir);
    float b = 2.0 * dot(oc, ray.dir);
    float c = dot(oc, oc) - radius * radius;
    float discriminant = b * b - 4.0 * a * c;
    if (discriminant < 0.0) return false;
    t = (-b - sqrt(discriminant)) / (2.0 * a);
    return t > 0.0;
}

// Ray-plane intersection
bool intersectPlane(Ray ray, vec3 normal, float dist, out float t) {
    float denom = dot(normal, ray.dir);
    if (abs(denom) > EPSILON) {
        t = (dist - dot(normal, ray.origin)) / denom;
        return t > 0.0;
    }
    return false;
}

// Ray-box intersection (AABB)
bool intersectBox(Ray ray, vec3 boxMin, vec3 boxMax, out float tNear) {
    vec3 invDir = 1.0 / ray.dir;
    vec3 tMin = (boxMin - ray.origin) * invDir;
    vec3 tMax = (boxMax - ray.origin) * invDir;
    vec3 t1 = min(tMin, tMax);
    vec3 t2 = max(tMin, tMax);
    tNear = max(max(t1.x, t1.y), t1.z);
    float tFar = min(min(t2.x, t2.y), t2.z);
    return tNear <= tFar && tFar > 0.0 && tNear > 0.0;
}

// Trace ray against all objects, return closest hit
Hit trace(Ray ray) {
    Hit hit;
    hit.hit = false;
    hit.reflectivity = 0.0;
    float minT = MAX_DIST;
    

    // Sphere
    float tSphere;
    if (intersectSphere(ray, spherePos, sphereRadius, tSphere) && tSphere < minT) {
        minT = tSphere;
        hit.point = ray.origin + tSphere * ray.dir;
        hit.normal = normalize(hit.point - spherePos);
        hit.color = sphereColor;
        hit.reflectivity = sphereReflectivity;
        hit.hit = true;
    }
    
    // Cube (box)
    vec3 boxMin = cubePos - cubeHalfSize;
    vec3 boxMax = cubePos + cubeHalfSize;
    float tCube;
    if (intersectBox(ray, boxMin, boxMax, tCube) && tCube < minT) {
        minT = tCube;
        hit.point = ray.origin + tCube * ray.dir;
        // Approximate normal (based on hit face; simplified)
        vec3 centered = hit.point - cubePos;
        hit.normal = normalize(vec3(
            abs(centered.x) > abs(centered.y) && abs(centered.x) > abs(centered.z) ? sign(centered.x) : 0.0,
            abs(centered.y) > abs(centered.x) && abs(centered.y) > abs(centered.z) ? sign(centered.y) : 0.0,
            abs(centered.z) > abs(centered.x) && abs(centered.z) > abs(centered.y) ? sign(centered.z) : 0.0
        ));
        hit.color = cubeColor;
        hit.reflectivity = cubeReflectivity;
        hit.hit = true;
    }
    
    // Plane
    float tPlane;
    if (intersectPlane(ray, planeNormal, planeDist, tPlane) && tPlane < minT) {
        minT = tPlane;
        hit.point = ray.origin + tPlane * ray.dir;
        hit.normal = planeNormal;
        hit.color = planeColor;
        hit.reflectivity = planeReflectivity;
        hit.hit = true;
    }
    
    return hit;
}

// Simple Phong lighting
vec3 computeLighting(vec3 point, vec3 normal, vec3 color, vec3 viewDir) {
    vec3 ambient = ambientColor * color;
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diff * lightColor * color;
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    vec3 specular = spec * lightColor * vec3(1.0);
    return ambient + diffuse + specular;
}

void main() {
    // Compute ray direction for this pixel
    vec2 uv = (vUv * 2.0 - 1.0) * vec2(resolution.x / resolution.y, 1.0);
    vec3 right = normalize(cross(cameraDir, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, cameraDir);
    vec3 rayDir = normalize(cameraDir + uv.x * right + uv.y * up);
    Ray primaryRay = Ray(cameraPos, rayDir);
    
    // Trace primary ray
    Hit primaryHit = trace(primaryRay);
    if (!primaryHit.hit) {
        FragColor = vec4(1.0, 0.0, 0.0, 1.0); // Background
        return;
    }
    
    vec3 viewDir = -rayDir;
    vec3 color = computeLighting(primaryHit.point, primaryHit.normal, primaryHit.color, viewDir);
    
    // If reflectivity > 0.5, cast reflection ray (simple single bounce)
    if (primaryHit.reflectivity > 0.5) {
        vec3 reflectDir = reflect(rayDir, primaryHit.normal);
        Ray reflectRay = Ray(primaryHit.point + primaryHit.normal * EPSILON, -reflectDir); // Note: direction towards reflection
        Hit reflectHit = trace(reflectRay);
        if (reflectHit.hit) {
            vec3 reflectViewDir = -reflectDir;
            vec3 reflectColor = computeLighting(reflectHit.point, reflectHit.normal, reflectHit.color, reflectViewDir);
            color = mix(color, reflectColor, primaryHit.reflectivity);
        }
    }
    
    FragColor = vec4(color, 1.0);`