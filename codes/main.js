//main.js
import { draw } from "./render.js"
import { eventInit } from "./event.js";
import { initMaps,initChunks } from "./state.js";
import { applyBrush } from "./brush.js";
import { state } from "./state.js";

const canvas = document.getElementById("canvas");
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

function loop(){
  if(state.leftDown || state.rightDown){
    applyBrush();
  }
  draw(canvas);
  requestAnimationFrame(loop);
}

initChunks()
initMaps();
eventInit();
loop();