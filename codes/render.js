import {
  state, chunkSize,
  cellSize, contour, DEFAULT_COLOR,
  blockColors, layerColors,
} from "./state.js";
import { nameToId } from "./nameMap.js";

const idToName = Object.fromEntries(
  Object.entries(nameToId).map(([key,value])=>[value, key])
)

function getColor(blockName) {
  if (colorCache.has(blockName)) return colorCache.get(blockName);

  console.log(blockName);
  const base = blockColors[blockName] ?? DEFAULT_COLOR;
  const color = `rgb(${base[0]},${base[1]},${base[2]})`;

  colorCache.set(blockName, color);
  return color;
}

const colorCache = new Map();

export function updateBlockMap() {
  const newMap = Array.from({ length: state.maxHeight }, () =>
    Array.from({ length: state.heightLength }, () =>
      new Array(state.widthLength).fill(0)
    )
  );

  for (let z = 0; z < state.heightLength; z++) {
    for (let x = 0; x < state.widthLength; x++) {
      const h = Math.floor(state.map[z][x]);
      for (let y = 0; y <= h && y < state.maxHeight; y++) {
        if (state.blockMap[y][z][x] === 0) {
          newMap[y][z][x] = 4;
        } else {
          newMap[y][z][x] = state.blockMap[y][z][x];
        }
      }
    }
  }

  state.blockMap = newMap;
}

function drawBrushPreview(canvas){ 
  const ctx = canvas.getContext("2d"); 
  const radius = state.brushRadius * cellSize * state.zoom; 
  ctx.beginPath(); 
  ctx.setLineDash([10, 4])
  ctx.arc(state.mouseX, state.mouseY, radius, 0, Math.PI * 2); 
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2; 
  ctx.stroke(); 
}

function drawChunkGrid(ctx, canvas, size, startX, startY, endX, endY) { 
  const chunk = 32; 
  ctx.strokeStyle = "rgba(255,255,255,0.2)"; 
  ctx.lineWidth = 1; 
  for (let x = Math.floor(startX / chunk) * chunk; x <= endX; x += chunk) {
    const px = x * size + state.camX; 
    ctx.beginPath(); ctx.moveTo(px, 0); 
    ctx.lineTo(px, canvas.height); 
    ctx.stroke(); 
  } 
  for (let y = Math.floor(startY / chunk) * chunk; y <= endY; y += chunk) {
    const py = y * size + state.camY; 
    ctx.beginPath(); ctx.moveTo(0, py); 
    ctx.lineTo(canvas.width, py); 
    ctx.stroke(); 
  } 
}

export function renderChunk(cx, cy){
  const size = cellSize;

  let canvas = state.chunkCanvas[cy][cx];
  if(!canvas){
    canvas = document.createElement("canvas");
    state.chunkCanvas[cy][cx] = canvas;
  }

  canvas.width = chunkSize * size;
  canvas.height = chunkSize * size;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const startX = cx * chunkSize;
  const startY = cy * chunkSize;
  const endX = Math.min(startX + chunkSize, state.widthLength);
  const endY = Math.min(startY + chunkSize, state.heightLength);

  ctx.beginPath();

  for(let y = startY; y < endY; y++){
    const row = state.map[y];
    const layerRow = state.layerMap[y];

    for(let x = startX; x < endX; x++){

      const h = row[x] | 0;
      const blockY = h < state.maxHeight ? h : state.maxHeight - 1;
      const topY = Math.floor(state.map[y][x]);

      const blockId =
        state.topBlockMap[y]?.[x] ??
        state.blockMap[topY]?.[y]?.[x] ??
        0;

      const blockName = idToName[blockId] ?? "Air";

      const isUnderWater = h < state.waterLevel;
      const px = (x - startX) * size;
      const py = (y - startY) * size;

      ctx.fillStyle = getColor(blockName);
      ctx.fillRect(px, py, size, size);

      const hLeft = state.map[y][x-1] ?? h;
      const hUp = state.map[y-1]?.[x] ?? h;

      const shadowStrength = Math.max(
        hLeft - h,
        hUp - h
      );

      if (shadowStrength > 0) {
        ctx.fillStyle = `rgba(0,0,0,${Math.min(0.6, shadowStrength * 0.08)})`;
        ctx.fillRect(px, py, size, size);
      }

      if(isUnderWater){
        ctx.fillStyle = "rgba(135,206,235,0.5)";
        ctx.fillRect(px, py, size, size);
      }
      const layer = layerRow[x];
      if(layer){
        const c = layerColors[layer];
        if(c){
          ctx.fillStyle = (layer === state.selectedLayer)
            ? "rgba(50,255,50,0.5)"
            : `rgba(${c[0]},${c[1]},${c[2]},0.35)`;
          ctx.fillRect(px, py, size, size);
        }
      }

      const level = (h / contour) | 0;

      if (x < state.widthLength - 1) {
        const rightLevel = ((row[x+1]) / contour) | 0;
        if (level !== rightLevel) {
          ctx.moveTo((x-startX+1)*size, (y-startY)*size);
          ctx.lineTo((x-startX+1)*size, (y-startY+1)*size);
        }
      }

      if (y < state.heightLength - 1) {
        const downLevel = ((state.map[y+1][x]) / contour) | 0;
        if (level !== downLevel) {
          ctx.moveTo((x-startX)*size, (y-startY+1)*size);
          ctx.lineTo((x-startX+1)*size, (y-startY+1)*size);
        }
      }
    }
  }

  ctx.strokeStyle = "black";
  ctx.lineWidth = Math.max(1, 2 / state.zoom);
  ctx.stroke();
}

export function draw(canvas){
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.imageSmoothingEnabled = false;

  const size = cellSize * state.zoom;

  const chunkPixel = chunkSize * size;

  const startChunkX = Math.max(0, Math.floor(-state.camX / chunkPixel));
  const startChunkY = Math.max(0, Math.floor(-state.camY / chunkPixel));
  const endChunkX = Math.min(state.chunkCols, Math.ceil((canvas.width - state.camX) / chunkPixel));
  const endChunkY = Math.min(state.chunkRows, Math.ceil((canvas.height - state.camY) / chunkPixel));

  for(const key of state.dirtyChunks){
    const [cx, cy] = key.split(",").map(Number);
    renderChunk(cx, cy);
  }
  state.dirtyChunks.clear();

  for(let cy = startChunkY; cy < endChunkY; cy++){
    for(let cx = startChunkX; cx < endChunkX; cx++){

      const chunk = state.chunkCanvas[cy][cx];
      if(!chunk) continue;

      const px = Math.round(cx * chunkPixel + state.camX);
      const py = Math.round(cy * chunkPixel + state.camY);

      ctx.drawImage(
        chunk,
        px,
        py,
        Math.round(chunk.width * state.zoom),
        Math.round(chunk.height * state.zoom)
      );
    }
  }

  drawChunkGrid(
    ctx,
    canvas,
    size,
    startChunkX * chunkSize,
    startChunkY * chunkSize,
    endChunkX * chunkSize,
    endChunkY * chunkSize
  );

  drawBrushPreview(canvas);
}