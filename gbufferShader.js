const gBufferShaderSource = `
precision highp float;

layout(location = 0) out vec4 gBufferColor;
layout(location = 1) out vec4 gBufferNormal;
layout(location = 2) out vec4 gBufferReflectivity;

in vec3 vNormal;

uniform vec3 uColor;
uniform float uReflectivity;
uniform vec3 uSpecular;
uniform mat4 viewMatrix;

void main() {
    // Write color (albedo) to the first buffer
    gBufferColor = vec4(uColor, 1.0);

    // Write world-space normal to the second buffer
    vec3 viewNormal = normalize(mat3(viewMatrix) * vNormal);
    gBufferNormal = vec4(viewNormal, 1.0);
    
    // Write reflectivity and specular color to the third buffer
    gBufferReflectivity = vec4(uSpecular, uReflectivity);

    // Write the fragment's depth value to the depth buffer.
    // gl_FragCoord.z contains the depth value of the fragment in clip space [0, 1].
    gl_FragDepth = gl_FragCoord.z;
}
`

export {gBufferShaderSource}