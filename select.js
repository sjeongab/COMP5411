// main.js
const container = document.getElementById('canvas');
const selector = document.getElementById('script-selector');

// Keep a reference to the currently active module
let currentModule = null;

// Function to clear the previous Three.js scene and stop its animation
function clearPreviousScene() {
  if (currentModule && currentModule.stop) {
    currentModule.stop(container);
  }
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

// Function to load and run a new module
async function loadModule(modulePath) {
  clearPreviousScene();

  try {
    const module = await import(`./${modulePath}`);
    currentModule = module;
    currentModule.init(container);
    console.log(`Loaded module: ${modulePath}`);
  } catch (error) {
    console.error('Failed to load module:', error);
  }
}

// Add an event listener to the selector
selector.addEventListener('change', (event) => {
  const selectedModule = event.target.value;
  loadModule(selectedModule);
});

// Load the initial module on page load
loadModule(selector.value);
