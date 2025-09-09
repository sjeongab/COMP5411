
const vs_temp = `
  attribute vec4 a_position;
  attribute vec3 a_normal;
  attribute vec2 a_texcoord;
  attribute vec4 a_color;

  uniform mat4 u_projection;
  uniform mat4 u_view;
  uniform mat4 u_world;
  uniform vec3 u_viewWorldPosition;

  varying vec3 v_normal;
  varying vec3 v_surfaceToView;
  varying vec2 v_texcoord;
  varying vec4 v_color;

  void main() {
    vec4 worldPosition = u_world * a_position;
    gl_Position = u_projection * u_view * worldPosition;
    v_surfaceToView = u_viewWorldPosition - worldPosition.xyz;
    v_normal = mat3(u_world) * a_normal;
    v_texcoord = a_texcoord;
    v_color = a_color;
  }
  `;

  const fs_temp = `
  precision highp float;

  varying vec3 v_normal;
  varying vec3 v_surfaceToView;
  varying vec2 v_texcoord;
  varying vec4 v_color;

  uniform vec3 diffuse;
  uniform sampler2D diffuseMap;
  uniform vec3 ambient;
  uniform vec3 emissive;
  uniform vec3 specular;
  uniform float shininess;
  uniform float opacity;
  uniform vec3 u_lightDirection;
  uniform vec3 u_ambientLight;

  void main () {
    vec3 normal = normalize(v_normal);

    vec3 surfaceToViewDirection = normalize(v_surfaceToView);
    vec3 halfVector = normalize(u_lightDirection + surfaceToViewDirection);

    float fakeLight = dot(u_lightDirection, normal) * .5 + .5;
    float specularLight = clamp(dot(normal, halfVector), 0.0, 1.0);

    vec4 diffuseMapColor = texture2D(diffuseMap, v_texcoord);
    vec3 effectiveDiffuse = diffuse * diffuseMapColor.rgb * v_color.rgb;
    float effectiveOpacity = opacity * diffuseMapColor.a * v_color.a;

    gl_FragColor = vec4(
        emissive +
        ambient * u_ambientLight +
        effectiveDiffuse * fakeLight +
        specular * pow(specularLight, shininess),
        effectiveOpacity);
  }
  `;

const vs = `
#version 300 es
in vec4 position;
in vec4 colour;
uniform mat4 projection, view;

out vec4 vColour;
out vec4 vPosition;
void main() {
  vColour = colour;
  vPosition = position; 
  gl_Position = projection * view * position;
}
`.trim();

const fs = `
#version 300 es
precision highp float;

in vec4 vColour;
in vec4 vPosition;

out vec4 fragColor;
void main() {
  fragColor = vec4(1.0, 1.0, 1.0, 1.0);
}
`.trim();

//TODO: Add texture
function loadShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

function loadShaderProgram(gl) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vs);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fs);
  
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.useProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      console.error(gl.getProgramInfoLog(program));

  return program;
}

class Shader{
  constructor(gl){
    this.program = loadShaderProgram(gl);
    this.vertexPosition = gl.getAttribLocation(this.program, "position");
    //this.vertexColour = gl.getAttribLocation(this.program, "colour");
    this.projectionMatrix = gl.getUniformLocation(this.program, "projection");
    this.viewMatrix = gl.getUniformLocation(this.program, "view");
  }
}

export {Shader};