let lastTime = 0;
let fps = 0;

function updateFPS(currentTime) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    fps = Math.round(1000 / deltaTime);
    document.getElementById('fps').innerText = `FPS: ${fps}`;
};

export {updateFPS};