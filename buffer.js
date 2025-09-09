function loadVertexBuffer(gl, positions) {
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);    
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    return vertexBuffer;
}

function loadColourBuffer(gl, faceColours) {
     var colours = [];
     for (var i=0; i<faceColours.length; ++i){
        const c = faceColours[i];
        colours = colours.concat(c,c,c,c);
     }
     const colourBuffer = gl.createBuffer();
     gl.bindBuffer(gl.ARRAY_BUFFER, colourBuffer);
     gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colours), gl.STATIC_DRAW);
     return colourBuffer;
}

function loadIndexBuffer(gl, indices){
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    return indexBuffer;
}

class Buffer{
    constructor(gl, position){
      
      //const positions = parseOBJ(box);
      console.log(position);

      this.vertexBuffer = loadVertexBuffer(gl, position);
      //this.colourBuffer = loadColourBuffer(gl, faceColours);
      this.indexBuffer = loadIndexBuffer(gl, indices);
    }
}
  
export {Buffer};