import { state, brushState, chunkSize, cellSize } from "./state.js";
import { heightClamp, lerp, applyColumnChanges } from "./utils.js";
import { nameToId } from "./nameMap.js";

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

// 通常ブラシ
function normalBrush(cellX, cellY, intensity){
  const r = state.brushRadius;
  const changed = new Set();

  // カスタムブラシ取得（default以外なら使う）
  const brushData = (brushState.brushType !== "default") 
    ? brushState.loadedBrushes[brushState.brushType] 
    : null;

  const brushWidth = brushData ? brushData[0].length : 0;
  const brushHeight = brushData ? brushData.length : 0;

  for(let dy=-r; dy<=r; dy++){
    for(let dx=-r; dx<=r; dx++){
      const x = cellX + dx;
      const y = cellY + dy;
      if(x<0||y<0||x>=state.widthLength||y>=state.heightLength) continue;

      const oldH = state.map[y][x];
      const distance = Math.hypot(dx, dy);
      if(distance>r) continue;

      const normalized = Math.pow(1 - distance/r, 2);

      // カスタムブラシ強度を乗算
      let strength = normalized;
      if(brushData){
        const imgX = Math.floor((dx + r) / (2*r) * brushWidth);
        const imgY = Math.floor((dy + r) / (2*r) * brushHeight);
        const brushStrength = brushData[imgY]?.[imgX] ?? 0;
        strength *= brushStrength; // 黒=1, 白=0
      }

      let newH = oldH;
      if(state.leftDown){
        if(state.mode==="flatten" && state.targetHeight!==null){
          newH = heightClamp(lerp(oldH, state.targetHeight, 0.08 * strength));
        } else {
          newH = heightClamp(oldH + (r - distance) * 0.03 * strength);
        }
      } else if(state.rightDown){
        if(state.mode!=="flatten"){
          newH = heightClamp(oldH - (r - distance) * 0.03 * strength);
        }
      }

      // 高さ制限
      if(brushState.atOrAboveEnabled && newH < brushState.orAboveRangeInput) continue;
      if(brushState.atOrBelowEnabled && newH > brushState.atOrBelowRangeInput) continue;

      const newY = Math.floor(newH);
      state.map[y][x] = newH;
      changed.add(`${x},${y}`);

      const ccx = (x / chunkSize)|0;
      const ccy = (y / chunkSize)|0;
      state.dirtyChunks.add(`${ccx},${ccy}`);
    }
  }
  applyColumnChanges(changed);
}

// 平滑ブラシ
function smoothBrush(cellX, cellY){
  const r = state.brushRadius;
  const changed = new Set();

  for(let dy=-r; dy<=r; dy++){
    for(let dx=-r; dx<=r; dx++){
      const x = cellX + dx;
      const y = cellY + dy;

      if(x<1||y<1||x>=state.widthLength-1||y>=state.heightLength-1) continue;
      if(dx*dx+dy*dy>r*r) continue;

      const oldH = state.map[y][x];

      const avg = (
        oldH +
        state.map[y][x-1] +
        state.map[y][x+1] +
        state.map[y-1][x] +
        state.map[y+1][x]
      ) / 5;

      const strength = 0.5 * (1 - (dx*dx + dy*dy)/(r*r));
      let newH = heightClamp(lerp(oldH, avg, strength));

      if(brushState.atOrAboveEnabled && newH < brushState.orAboveRangeInput) continue;
      if(brushState.atOrBelowEnabled && newH > brushState.atOrBelowRangeInput) continue;

      state.map[y][x] = newH;
      changed.add(`${x},${y}`);
    }
  }
  applyColumnChanges(changed);
}

// スプレーブラシ（上書き）
function sprayBrush(cellX, cellY){
  const density = state.brushRadius * 3;
  const changed = new Set();

  for(let i=0; i<density; i++){
    const angle = Math.random()*Math.PI*2;
    const radius = Math.sqrt(Math.random())*state.brushRadius;

    const dx = Math.round(Math.cos(angle)*radius);
    const dz = Math.round(Math.sin(angle)*radius);

    const x = cellX + dx;
    const z = cellY + dz;

    if(x<0||z<0||x>=state.widthLength||z>=state.heightLength) continue;
    if(!state.leftDown) continue;

    const oldH = state.map[z][x];

    const newH = heightClamp(oldH);

    state.map[z][x] = newH;
    changed.add(`${x},${z}`);
  }

  applyColumnChanges(changed);
}

function layerBrush(cellX, cellY) { 
  const r = state.brushRadius; 
  const r2 = r * r; 

  for (let dy = -r; dy <= r; dy++) { 
    for (let dx = -r; dx <= r; dx++) { 
      if (dx * dx + dy * dy > r2) continue; 

      const x = cellX + dx; 
      const y = cellY + dy; 
      if (x < 0 || y < 0 || x >= state.widthLength || y >= state.heightLength) continue; 

      const currentHeight = state.map[y][x];

      // 高さ制限チェック
      if (brushState.atOrAboveEnabled && currentHeight < brushState.orAboveRangeInput) continue;
      if (brushState.atOrBelowEnabled && currentHeight > brushState.atOrBelowRangeInput) continue;

      if (state.leftDown) state.layerMap[y][x] = state.selectedLayer; 
      else if (state.rightDown) state.layerMap[y][x] = null; 

      const ccx = (x / chunkSize) | 0; 
      const ccy = (y / chunkSize) | 0; 
      state.dirtyChunks.add(`${ccx},${ccy}`); 
    } 
  } 
} 

// ブラシ適用
export function applyBrush() {
  const size = cellSize * state.zoom;
  const cellX = Math.floor((state.mouseX - state.camX) / size);
  const cellY = Math.floor((state.mouseY - state.camY) / size);

  if (cellX < 0 || cellY < 0 || cellX >= state.widthLength || cellY >= state.heightLength) return;

  const locationBar = document.getElementById("location");
  const heightBar = document.getElementById("heightchild");
  locationBar.textContent = `Location: ${cellX}, ${cellY}`;
  heightBar.textContent = `Height: ${Math.floor(state.map[cellY][cellX])}/${state.maxHeight}`;

  if (!state.leftDown && !state.rightDown) return;

  switch (state.mode) {
    case "smooth":
      smoothBrush(cellX, cellY);
      break;
    case "sprayPaint":
      sprayBrush(cellX, cellY);
      break;
    case "layerPaint":
      layerBrush(cellX, cellY);
      break;
    default:
      markDirtyArea(cellX, cellY, state.brushRadius);
      normalBrush(cellX, cellY);
  }
}