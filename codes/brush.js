import { state, cellSize } from "./state.js";
import { heightClamp, lerp } from "./utils.js";
import { updateBlockMap } from "./render.js";
import { nameToId } from "./nameMap.js";

let kernelCache = null;
let kernelRadius = -1;

function normalBrush(cellX, cellY){
  const r = state.brushRadius;

  for(let dy = -r; dy <= r; dy++){
    for(let dx = -r; dx <= r; dx++){
      const x = cellX + dx;
      const y = cellY + dy;
      if(x < 0 || y < 0 || x >= state.widthLength || y >= state.heightLength) continue;

      const distance = Math.hypot(dx, dy);
      if(distance > r) continue;

      const normalized = Math.pow(1 - distance / r, 2);

      if(state.leftDown){
        if(state.mode === "flatten" && state.targetHeight !== null){
          state.map[y][x] = heightClamp(
            lerp(state.map[y][x], state.targetHeight, 0.08 * normalized)
          );
        } else {
          // 高さを盛る
          state.map[y][x] = heightClamp(
            state.map[y][x] + (r - distance) * 0.03 * normalized
          );
        }
      } else if(state.rightDown){
        if(state.mode !== "flatten"){
          // 高さを下げる
          state.map[y][x] = heightClamp(
            state.map[y][x] - (r - distance) * 0.03 * normalized
          );
        }
      }
    }
  }
}

// ガウシアンカーネルを返す
function getKernel(radius){
  if(kernelCache && kernelRadius === radius) return kernelCache;

  const sigma = radius / 2;
  const twoSigmaSq = 2 * sigma * sigma;
  const size = radius * 2 + 1;
  const kernel = [];

  for(let y = -radius; y <= radius; y++){
    const row = [];
    for(let x = -radius; x <= radius; x++){
      const d2 = x*x + y*y;
      row.push(d2 > radius*radius ? 0 : Math.exp(-d2 / twoSigmaSq));
    }
    kernel.push(row);
  }

  kernelCache = kernel;
  kernelRadius = radius;
  return kernel;
}

// 滑らかブラシ
function smoothBrush(cellX, cellY){
  const r = state.brushRadius;
  const kernel = getKernel(r);

  const minX = Math.max(0, cellX - r);
  const maxX = Math.min(state.widthLength - 1, cellX + r);
  const minY = Math.max(0, cellY - r);
  const maxY = Math.min(state.heightLength - 1, cellY + r);

  const copy = [];
  for(let y = minY; y <= maxY; y++){
    copy.push(state.map[y].slice(minX, maxX + 1));
  }

  for(let dy = -r; dy <= r; dy++){
    for(let dx = -r; dx <= r; dx++){
      const x = cellX + dx;
      const y = cellY + dy;
      if(x < 0 || x >= state.widthLength || y < 0 || y >= state.heightLength) continue;
      const d2 = dx*dx + dy*dy;
      if(d2 > r*r) continue;

      let sum = 0;
      let weightSum = 0;

      for(let ky = -r; ky <= r; ky++){
        for(let kx = -r; kx <= r; kx++){
          const nx = x + kx;
          const ny = y + ky;
          if(nx < minX || nx > maxX || ny < minY || ny > maxY) continue;
          const weight = kernel[ky + r][kx + r];
          if(weight === 0) continue;
          sum += copy[ny - minY][nx - minX] * weight;
          weightSum += weight;
        }
      }

      if(weightSum === 0) continue;

      const avg = sum / weightSum;
      const distFactor = 1 - (d2 / (r*r));
      const strength = 0.15 * distFactor;

      state.map[y][x] = heightClamp(lerp(state.map[y][x], avg, strength));
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
      console.log(state.selectedBlock);
      state.blockMap[yTop][z][x] = nameToId[state.selectedBlock];
    }
  }
}

function layerBrush(cellX, cellY) {
  const r = state.brushRadius;

  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const distance = Math.hypot(dx, dy);
      if (distance > r) continue; // 円形ブラシにする場合

      const x = cellX + dx;
      const y = cellY + dy;

      if (x < 0 || y < 0 || x >= state.widthLength || y >= state.heightLength) continue;

      if (state.leftDown) {
        state.layerMap[y][x] = state.selectedLayer;
      }
      if (state.rightDown) {
        state.layerMap[y][x] = null;
      }
    }
  }
}

function fillWaterAll(cellX, cellY) {
  const width = state.widthLength;
  const height = state.heightLength;
  const maxH = state.maxHeight;

  const waterId = 126;
  
  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      let maxWaterHeight = -1;

      for (let y = 0; y <= state.map[cellY][cellX]; y++) {
        if (state.blockMap[y][z][x] === 0) {
          state.blockMap[y][z][x] = waterId;
          maxWaterHeight = y;
        }
      }

      if (maxWaterHeight >= 0) {
        state.map[z][x] = Math.max(state.map[z][x], maxWaterHeight + 1);
      }
    }
  }
}

export function spongeAll(cellX, cellY) {
  const width = state.widthLength;
  const height = state.heightLength;
  const maxH = state.maxHeight;

  const airId = 0;
  const waterId = 126;

  // クリックした座標に水がなければ何もしない
  if (state.blockMap[cellY][cellY][cellX] !== waterId) return;

  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      // 水を空気に置換
      for (let y = 0; y < maxH; y++) {
        if (state.blockMap[y][z][x] === waterId) {
          state.blockMap[y][z][x] = airId;
        }
      }

      // state.map を更新（最上部の非空気ブロック）
      for (let y = maxH - 1; y >= 0; y--) {
        if (state.blockMap[y][z][x] !== airId) {
          state.map[z][x] = y + 1;
          break;
        }
        if (y === 0) state.map[z][x] = 0;
      }
    }
  }

  updateBlockMap();
}

export function brush(e){
  state.mouseX = e.offsetX;
  state.mouseY = e.offsetY;

  const size = cellSize * state.zoom;
  const cellX = Math.floor((e.offsetX - state.camX) / size);
  const cellY = Math.floor((e.offsetY - state.camY) / size);
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
  if(state.mode === "fillWithWater"){
    fillWaterAll(cellX, cellY);
    return;
  }
  if(state.mode === "Sponge"){
    spongeAll(cellX, cellY);
    return;
  }
  normalBrush(cellX, cellY);
  updateBlockMap();
}
