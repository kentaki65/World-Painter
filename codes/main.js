//main.js
import { draw } from "./render.js"
import { eventInit } from "./event.js";
import { initMaps,initChunks } from "./state.js";
import { applyBrush } from "./brush.js";
import { state } from "./state.js";

let lastTime = 0;
const canvas = document.getElementById("canvas");
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

function loop(time){
  if(time - lastTime > 16){
    if(state.leftDown || state.rightDown){
      applyBrush();
    }
    lastTime = time;
  }
  draw(canvas);
  requestAnimationFrame(loop);
}

initChunks()
initMaps();
eventInit();
loop();