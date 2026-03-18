import {
  state,
  cellSize, widthLength, heightLength, maxHeight,
} from "./state.js";
import { heightClamp, lerp } from "./utils.js";

function normalBrush(cellX, cellY){
  for(let dy = -state.brushRadius; dy <= state.brushRadius; dy++){
    for(let dx = -state.brushRadius; dx <= state.brushRadius; dx++){
      const x = cellX + dx;
      const y = cellY + dy;
      if(x < 0 || y < 0 || x >= widthLength || y >= heightLength) continue;

      const distance = Math.hypot(dx, dy);
      if(distance <= state.brushRadius){
        const normalized = Math.pow(1 - distance / state.brushRadius, 2);

        if(state.leftDown){
          if(state.mode === "flatten" && state.targetHeight !== null){
            state.map[y][x] = heightClamp(
              lerp(state.map[y][x], state.targetHeight, 0.08 * normalized) // 弱め
            );
          } else {
            state.map[y][x] = heightClamp(
              state.map[y][x] + (state.brushRadius - distance) * 0.03 * normalized
            );
          }
        } 
        else if(state.rightDown){
          if(state.mode !== "flatten"){
            state.map[y][x] = heightClamp(
              state.map[y][x] - (state.brushRadius - distance) * 0.03 * normalized
            );
          }
        }
      }
    }
  }
}
function smoothBrush(cellX, cellY){
  const copy = state.map.map(row => row.slice());
  const sigma = state.brushRadius / 2;
  const twoSigmaSq = 2 * sigma * sigma;
  for(let dy = -state.brushRadius; dy <= state.brushRadius; dy++){
    for(let dx = -state.brushRadius; dx <= state.brushRadius; dx++){
      const x = cellX + dx;
      const y = cellY + dy;
      const distance = Math.hypot(dx, dy);
      if(distance > state.brushRadius) continue;
      let sum = 0;
      let weightSum = 0;
      for(let ky = -state.brushRadius; ky <= state.brushRadius; ky++){
        for(let kx = -state.brushRadius; kx <= state.brushRadius; kx++){
          const nx = x + kx;
          const ny = y + ky;
          if(ny < 0 || ny >= copy.length) continue;
          if(nx < 0 || nx >= copy[ny].length) continue;
          const value = copy[ny][nx];
          if(!Number.isFinite(value)) continue;
          const d = Math.hypot(kx, ky);
          if(d > state.brushRadius) continue;
          const weight = Math.exp(-(d*d) / twoSigmaSq);
          sum += value * weight;
          weightSum += weight;
        }
      }
      if(weightSum === 0) continue;
      const avg = sum / weightSum;
      const normalized = 1 - distance / state.brushRadius;
      const strength = 0.15 * normalized;
      state.map[y][x] = heightClamp(lerp(copy[y][x], avg, strength));
    }
  }
}

function sprayBrush(cellX, cellY){
  const density = state.brushRadius * 3;
  for(let i = 0; i < density; i++){
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * state.brushRadius;
    const dx = Math.round(Math.cos(angle) * radius);
    const dy = Math.round(Math.sin(angle) * radius);
    const x = cellX + dx;
    const y = cellY + dy;
    if(x < 0 || y < 0 || x >= widthLength || y >= heightLength) continue;
    if(state.leftDown){
      state.blockMap[y][x] = state.selectedBlock;
    }
  }
}

function layerBrush(cellX, cellY){
  const density = state.brushRadius * 3;
  for(let i=0;i<density;i++){
    const angle = Math.random()*Math.PI*2;
    const radius = Math.sqrt(Math.random())*state.brushRadius;
    const dx = Math.round(Math.cos(angle)*radius);
    const dy = Math.round(Math.sin(angle)*radius);
    const x = cellX + dx;
    const y = cellY + dy;
    if(x<0 || y<0 || x>=widthLength || y>=heightLength) continue;
    if(state.leftDown){
      layerMap[y][x] = selectedLayer;
    }
    if(state.rightDown){
      layerMap[y][x] = null;
    }
  }
}

export function brush(e){
  state.mouseX = e.offsetX;
  state.mouseY = e.offsetY;

  const size = cellSize * state.zoom;
  const cellX = Math.floor((e.offsetX - state.camX) / size);
  const cellY = Math.floor((e.offsetY - state.camY) / size);
  if(cellX < 0 || cellY < 0 || cellX >= widthLength || cellY >= heightLength) return;

  const locationBar = document.getElementById("location");
  const heightBar = document.getElementById("heightchild");
  locationBar.textContent = `Location: ${cellX}, ${cellY}`;
  heightBar.textContent = `Height: ${Math.floor(state.map[cellY][cellX])}/${maxHeight}`;

  if(!state.leftDown && !state.rightDown) return;
  if(state.mode === "smooth"){
    smoothBrush(cellX, cellY);
    return;
  }
  if(state.mode === "sprayPaint"){
    sprayBrush(cellX, cellY);
    return;
  }
  if(state.mode === "layerPaint"){
    layerBrush(cellX, cellY);
    return;
  }
  normalBrush(cellX, cellY);
}
