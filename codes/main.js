//main.js
import { draw } from "./render.js"
import { eventInit } from "./event.js";
import { initMaps,initChunks } from "./state.js";
import { applyBrush } from "./brush.js";
import { state } from "./state.js";
import { beginStroke, endStroke } from "./brush.js";
import { initDB, loadFromDB, autoSave } from "./autosave.js";

let lastTime = 0;
const canvas = document.getElementById("canvas");
canvas.addEventListener("mousedown", beginStroke);
canvas.addEventListener("mouseup", endStroke);

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
autoSave();

await initDB();

const data = await loadFromDB();
if (data) {
  state.map = data.map;
  state.topBlockMap = data.topBlockMap;
  state.layerMap = data.layerMap;

  for (let cy = 0; cy < state.chunkRows; cy++) {
    for (let cx = 0; cx < state.chunkCols; cx++) {
      state.dirtyChunks.add(`${cx},${cy}`);
    }
  }
}