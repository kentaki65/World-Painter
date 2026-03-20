import {
  state,
  cellSize, contour, DEFAULT_COLOR,
  blockColors, layerColors,
} from "./state.js";
import { nameToId } from "./nameMap.js";

const idToName = Object.fromEntries(
  Object.entries(nameToId).map(([k,v]) => [v,k])
);

function drawBrushPreview(canvas){
  const ctx = canvas.getContext("2d");
  const radius = state.brushRadius * cellSize * state.zoom;

  ctx.beginPath();
  ctx.arc(state.mouseX, state.mouseY, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawChunkGrid(ctx, canvas, size, startX, startY, endX, endY) {
  const chunk = 32;

  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;

  for (let x = Math.floor(startX / chunk) * chunk; x <= endX; x += chunk) {
    const px = x * size + state.camX;

    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, canvas.height);
    ctx.stroke();
  }

  for (let y = Math.floor(startY / chunk) * chunk; y <= endY; y += chunk) {
    const py = y * size + state.camY;

    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(canvas.width, py);
    ctx.stroke();
  }
}

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

export function draw(canvas){
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const size = cellSize * state.zoom;

  const startX = Math.max(0, Math.floor(-state.camX / size));
  const startY = Math.max(0, Math.floor(-state.camY / size));
  const endX = Math.min(state.widthLength, Math.ceil((canvas.width - state.camX) / size));
  const endY = Math.min(state.heightLength, Math.ceil((canvas.height - state.camY) / size));

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {

      const h = state.map[y][x];
      const blockY = Math.min(Math.floor(h), state.maxHeight - 1);
      const blockId = state.blockMap[blockY]?.[y]?.[x] ?? 0;
      const blockName = idToName[blockId] ?? "Air";
      const baseColor = blockColors[blockName] ?? DEFAULT_COLOR;

      const isRange = x > 0 && y > 0 && x < state.widthLength-1 && y < state.heightLength-1;

      const diffWidth = isRange ? state.map[y][x-1] - state.map[y][x+1] : 0;
      const diffHeight = isRange ? state.map[y-1][x] - state.map[y+1][x] : 0;

      let delta = diffWidth + diffHeight;
      if(state.leftDown || state.rightDown){
        delta = Math.max(-5, Math.min(5, delta));
      }

      let brightness = 1 - delta * 0.01;
      brightness = Math.max(0.3, Math.min(1.3, brightness));

      const r = baseColor[0] * brightness | 0;
      const g = baseColor[1] * brightness | 0;
      const b = baseColor[2] * brightness | 0;

      ctx.fillStyle = `rgb(${r},${g},${b})`;

      const px = x * size + state.camX;
      const py = y * size + state.camY;

      ctx.fillRect(px, py, size, size);

      const layer = state.layerMap[y][x];
      if(layer){
        const c = layerColors[layer];
        if(c){
          if(layer === state.selectedLayer){
            ctx.fillStyle = `rgba(50,255,50,0.5)`;
          } else {
            ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},0.35)`;
          }
          ctx.fillRect(px, py, size, size);
        }
      }

      const level = (h / contour) | 0;

      if (x < state.widthLength - 1) {
        const rightLevel = (state.map[y][x+1] / contour) | 0;
        if (level !== rightLevel) {
          ctx.beginPath();
          ctx.moveTo((x+1)*size + state.camX, y*size + state.camY);
          ctx.lineTo((x+1)*size + state.camX, (y+1)*size + state.camY);
          ctx.strokeStyle = "black";
          ctx.stroke();
        }
      }

      if (y < state.heightLength - 1) {
        const downLevel = (state.map[y+1][x] / contour) | 0;
        if (level !== downLevel) {
          ctx.beginPath();
          ctx.moveTo(x*size + state.camX, (y+1)*size + state.camY);
          ctx.lineTo((x+1)*size + state.camX, (y+1)*size + state.camY);
          ctx.strokeStyle = "black";
          ctx.stroke();
        }
      }
    }
  }

  drawChunkGrid(ctx, canvas, size, startX, startY, endX, endY);
  drawBrushPreview(canvas);
  //updateBlockMap();
}