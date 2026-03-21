import { state, chunkSize, cellSize } from "./state.js";
import { heightClamp, lerp } from "./utils.js";
import { nameToId } from "./nameMap.js";

function updateBlockData(x, z, oldH, newH){
  const oldY = Math.floor(oldH);
  const newY = Math.floor(newH);

  if(newY > oldY){
    for(let y = oldY + 1; y <= newY; y++){
      if(y >= state.maxHeight) break;
      if(y === newY){
        state.blockMap[y][z][x] = nameToId["Grass Block"];
      }
    }
  }

  else if(newY < oldY){
    for(let y = newY + 1; y <= oldY; y++){
      if(y >= state.maxHeight) break;
      state.blockMap[y][z][x] = 0;
    }
  }
}

function normalBrush(cellX, cellY){
  const r = state.brushRadius;
  for(let dy = -r; dy <= r; dy++){
    for(let dx = -r; dx <= r; dx++){
      const x = cellX + dx;
      const y = cellY + dy;
      if(x < 0 || y < 0 || x >= state.widthLength || y >= state.heightLength) continue;

      const oldH = state.map[y][x];
      const distance = Math.hypot(dx, dy);
      if(distance > r) continue;

      const normalized = Math.pow(1 - distance / r, 2);

      if(state.leftDown){
        if(state.mode === "flatten" && state.targetHeight !== null){
          state.map[y][x] = heightClamp(
            lerp(state.map[y][x], state.targetHeight, 0.08 * normalized)
          );
        } else {
          state.map[y][x] = heightClamp(
            state.map[y][x] + (r - distance) * 0.03 * normalized
          );
        }
      } else if(state.rightDown){
        if(state.mode !== "flatten"){
          state.map[y][x] = heightClamp(
            state.map[y][x] - (r - distance) * 0.03 * normalized
          );
        }
      }
      const newH = state.map[y][x];
      updateBlockData(x, y, oldH, newH);
    }
  }
}

function markDirtyArea(cx, cy, r){
  const minX = Math.max(0, cx - r);
  const maxX = Math.min(state.widthLength - 1, cx + r);
  const minY = Math.max(0, cy - r);
  const maxY = Math.min(state.heightLength - 1, cy + r);

  for(let y = minY; y <= maxY; y += chunkSize){
    for(let x = minX; x <= maxX; x += chunkSize){
      const ccx = (x / chunkSize) | 0;
      const ccy = (y / chunkSize) | 0;
      state.dirtyChunks.add(`${ccx},${ccy}`);
    }
  }
}

function smoothBrush(cellX, cellY){
  const r = state.brushRadius;

  for(let dy = -r; dy <= r; dy++){
    for(let dx = -r; dx <= r; dx++){
      const x = cellX + dx;
      const y = cellY + dy;

      if(x < 1 || y < 1 || x >= state.widthLength-1 || y >= state.heightLength-1) continue;

      const d2 = dx*dx + dy*dy;
      if(d2 > r*r) continue;

      const oldH = state.map[y][x];

      const avg =
        (oldH +
         state.map[y][x-1] +
         state.map[y][x+1] +
         state.map[y-1][x] +
         state.map[y+1][x]) / 5;

      const strength = 0.2 * (1 - d2/(r*r));

      const newH = heightClamp(lerp(oldH, avg, strength));
      state.map[y][x] = newH;

      updateBlockData(x, y, oldH, newH);
    }
  }
}

function sprayBrush(cellX, cellY){
  const density = state.brushRadius * 3;

  for(let i = 0; i < density; i++){
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * state.brushRadius;

    const dx = Math.round(Math.cos(angle) * radius);
    const dz = Math.round(Math.sin(angle) * radius);

    const x = cellX + dx;
    const z = cellY + dz;

    if(x < 0 || z < 0 || x >= state.widthLength || z >= state.heightLength) continue;

    if(state.leftDown){

      let yTop = -1;

      for(let y = state.maxHeight - 1; y >= 0; y--){
        if(state.blockMap[y][z][x] !== 0){
          yTop = y;
          break;
        }
      }

      if(yTop === -1) continue;

      state.blockMap[yTop][z][x] = nameToId[state.selectedBlock];
      const ccx = (x / chunkSize) | 0;
      const ccy = (z / chunkSize) | 0;
      state.dirtyChunks.add(`${ccx},${ccy}`);
    }
  }
}
function layerBrush(cellX, cellY){
  const r = state.brushRadius;
  const r2 = r*r;

  for(let dy = -r; dy <= r; dy++){
    for(let dx = -r; dx <= r; dx++){
      if(dx*dx + dy*dy > r2) continue;

      const x = cellX + dx;
      const y = cellY + dy;

      if(x < 0 || y < 0 || x >= state.widthLength || y >= state.heightLength) continue;

      if(state.leftDown){
        state.layerMap[y][x] = state.selectedLayer;
      }
      else if(state.rightDown){
        state.layerMap[y][x] = null;
      }

      const ccx = (x / chunkSize) | 0;
      const ccy = (y / chunkSize) | 0;
      state.dirtyChunks.add(`${ccx},${ccy}`);
    }
  }
}

export function applyBrush(){
  const size = cellSize * state.zoom;
  const cellX = Math.floor((state.mouseX - state.camX) / size);
  const cellY = Math.floor((state.mouseY - state.camY) / size);

  if(cellX < 0 || cellY < 0 || cellX >= state.widthLength || cellY >= state.heightLength) return;

  const locationBar = document.getElementById("location");
  const heightBar = document.getElementById("heightchild");
  locationBar.textContent = `Location: ${cellX}, ${cellY}`;
  heightBar.textContent = `Height: ${Math.floor(state.map[cellY][cellX])}/${state.maxHeight}`;

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
  markDirtyArea(cellX, cellY, state.brushRadius);
  normalBrush(cellX, cellY);
  updateBlockData(cellX, cellY);
}