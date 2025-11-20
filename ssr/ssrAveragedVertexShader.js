// ssrAveragedVertexShader.js (New file, copy of ssrVertexShader.js for averaged mode)
const ssrAveragedVertexShader = `
    
void main() {
        gl_Position = vec4(position, 1.0);
    }
`;


export {ssrAveragedVertexShader};