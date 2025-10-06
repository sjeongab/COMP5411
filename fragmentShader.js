const fragmentShaderSource = `
precision highp float;

uniform sampler2D tDepth;
uniform float cameraNear;
uniform float cameraFar;

in vec2 vUv;

out vec4 fragColor;

// Helper functions provided by Three.js are still required.
float perspectiveDepthToViewZ(const in float invClipZ, const in float near, const in float far) {
    return (near * far) / ((near - far) * invClipZ + far);
}

float viewZToOrthographicDepth(const in float viewZ, const in float near, const in float far) {
    return (viewZ + near) / (near - far);
}

void main() {
    float fragCoordZ = texture(tDepth, vUv).x;
    
    // For WebGL2, the depth texture is not automatically converted,
    // so we must read the red channel (.x) to get the depth value.
    
    float viewZ = perspectiveDepthToViewZ(fragCoordZ, cameraNear, cameraFar);
    float linearDepth = viewZToOrthographicDepth(viewZ, cameraNear, cameraFar);

    if (fragCoordZ == 1.0) {
      // Background pixels where no depth was written
      fragColor = vec4(0.0);
    } else {
      fragColor = vec4(vec3(1.0 - linearDepth), 1.0);
    }
}
`

export {fragmentShaderSource}