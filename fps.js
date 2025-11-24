let fpsData = [];
let fps = 0;
let frameCount = 0;
let TEST_FPS = 1;
let lastFpsTime = performance.now();

function updateFPS(currentTime) {
    frameCount++;
    if (currentTime - lastFpsTime >= 1000) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastFpsTime));
        frameCount = 0;
        lastFpsTime = currentTime;

        fpsData.push(`${new Date().toISOString()}: ${fps} FPS`)
        document.getElementById('fps').innerText = `FPS: ${fps}`;
    }
};

function saveFPSData() {
    const content = fpsData.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `fps_log_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    fpsData = [];
}

//setInterval(saveFPSData, 10000);
//window.addEventListener('beforeunload', saveFPSData);

export {TEST_FPS, updateFPS};