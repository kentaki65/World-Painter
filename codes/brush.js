import { state, cellSize } from "./state.js";
import { heightClamp, lerp } from "./utils.js";

let kernelCache = null;
let kernelRadius = -1;

function normalBrush(cellX, cellY){
  for(let dy = -state.brushRadius; dy <= state.brushRadius; dy++){
    for(let dx = -state.brushRadius; dx <= state.brushRadius; dx++){
      const x = cellX + dx;
      const y = cellY + dy;
      if(x < 0 || y < 0 || x >= state.widthLength || y >= state.heightLength) continue;

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
      if(d2 > radius*radius){
        row.push(0);
      } else {
        row.push(Math.exp(-d2 / twoSigmaSq));
      }
    }
    kernel.push(row);
  }

  kernelCache = kernel;
  kernelRadius = radius;
  return kernel;
}

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
          const value = copy[ny - minY][nx - minX];
          sum += value * weight;
          weightSum += weight;
        }
      }
      if(weightSum === 0) continue;
      const avg = sum / weightSum;
      const distFactor = 1 - (d2 / (r*r));
      const strength = 0.15 * distFactor;

      state.map[y][x] = heightClamp(
        lerp(state.map[y][x], avg, strength)
      );
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
      const y = Math.floor(state.map[z][x]);
      state.blockMap[y][z][x] = state.selectedBlock;
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

    if(x<0 || y<0 || x>=state.widthLength || y>=state.heightLength) continue;
    if(state.leftDown){
      state.layerMap[y][x] = state.selectedLayer;
    }
    if(state.rightDown){
      state.layerMap[y][x] = null;
    }
  }
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
  normalBrush(cellX, cellY);
}
