//main.js
import { draw } from "./render.js"
import { eventInit } from "./event.js";
const canvas = document.getElementById("canvas");
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

function loop(){
  draw(canvas);
  requestAnimationFrame(loop);
}

eventInit();
loop();