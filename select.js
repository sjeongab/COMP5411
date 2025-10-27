import {drawPlain} from "./plain.js"
import {drawHybrid} from "./hybrid.js"
import {drawSSR} from "./ssr.js"

const modeSelect = document.getElementById("modeSelect");
modeSelect.addEventListener("change", (event) => {
    let mode = event.target.value;
    console.log(mode);
    draw(mode);
});

function draw(mode){
    if(mode == "plain.js"){
    drawPlain();
    }
    else if (mode == "hybrid.js"){
        drawHybrid();
    }
    else{
        drawSSR();
    }
};