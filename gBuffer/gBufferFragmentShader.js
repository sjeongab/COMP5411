const gBufferFragmentShader = `
    precision highp float;

    uniform vec3 uColor;
    uniform float uReflectivity;
    uniform int uShininess;
    uniform vec3 uSpecular;

    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec3 vViewPosition;

    layout(location = 0) out vec4 gColor;
    layout(location = 1) out vec4 gNormal;
    layout(location = 2) out vec4 gPosition;
    layout(location = 3) out float gReflection;

    void main() {
        vec3 lightPos = vec3(5, 10, 7);

        vec3 ambientColor = vec3(0.25098, 0.25098, 0.25098); // TODO: import ambientColor as uniform
        vec3 ambient = ambientColor * uColor;

        
        vec3 lightDirection = normalize(lightPos - vWorldPosition);
        float diff = max(dot(vNormal, lightDirection), 0.0);
        vec3 diffuse = diff * uColor;

        vec3 specular = vec3(0.0);

        if(uShininess != 0){
            vec3 viewDir = normalize(vViewPosition-vWorldPosition);
            vec3 reflectDir = reflect(-lightDirection, vNormal);
            float spec = max(dot(reflectDir, viewDir), 0.0);
            specular = pow(spec, float(uShininess)) * uSpecular;
        }

        //gColor = vec4(specular, 1.0);
        //gColor = vec4(ambient+diffuse+specular, 1.0);
        gColor = vec4(uColor, 1.0);
        //gColor = vec4((ambient+diffuse)*uColor, 1.0);
        gNormal = vec4(vNormal, 1.0);
        gPosition = vec4(vWorldPosition, 1.0);
        gReflection = uReflectivity;
    }
`;

export {gBufferFragmentShader};