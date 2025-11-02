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
        vec3 ambientColor = vec3(0.25098, 0.25098, 0.25098); // TODO: import ambientColor as uniform
        vec3 ambient = ambientColor * uColor;

        vec3 lightDir = vec3(0.379, 0.758, 0.531); // TODO: import light position as uniform and calculate lightDir
        vec3 lightDirection = normalize(lightDir);
        float diff = max(dot(vNormal, lightDirection), 0.0);
        vec3 lightColor = vec3(1.0,1.0,1.0); // TODO: import lightColor as uniform
        vec3 diffuse = diff * lightColor * uColor;

        vec3 specular = vec3(0.0);

        if(uShininess != 0){
            vec3 lightPos = vec3(5, 10, 7);
            vec3 viewDir = normalize(vViewPosition - vWorldPosition);
            vec3 reflectDir = reflect(-lightDirection, vNormal);
            float spec = pow(max(dot(viewDir, reflectDir), 0.0), float(uShininess));
            specular = spec * uColor;
            //specular = spec * ambientColor;
        }



        gColor = vec4(ambient+diffuse+specular, 1.0); //TODO: add phong shading to the gColor
        gNormal = vec4(normalize(vNormal), 1.0);
        gPosition = vec4(vWorldPosition, 1.0);
        gReflection = uReflectivity;
    }
`;

export {gBufferFragmentShader};