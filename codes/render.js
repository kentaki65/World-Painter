import {
  state,
  cellSize, widthLength, heightLength, maxHeight, contour, DEFAULT_COLOR,
  blockColors, layerColors,
} from "./state.js";
import { clamp } from "./utils.js";


function drawBrushPreview(canvas){
  const ctx = canvas.getContext("2d");
  const radius = state.brushRadius * cellSize * state.zoom;

  ctx.beginPath();
  ctx.arc(state.mouseX, state.mouseY, radius, 0, Math.PI * 2);

  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawChunkGrid(ctx, canvas, size) {
  const chunk = 32;
  const step = chunk * size;

  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;

  // 縦線
  for (let x = 0; x <= widthLength; x += chunk) {
    const px = x * size + state.camX;

    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, canvas.height);
    ctx.stroke();
  }

  // 横線
  for (let y = 0; y <= heightLength; y += chunk) {
    const py = y * size + state.camY;

    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(canvas.width, py);
    ctx.stroke();
  }
}

export function draw(canvas){
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const size = cellSize * state.zoom;
  for (let y = 0; y < state.map.length; y++) {
    for (let x = 0; x < state.map[y].length; x++) {

      const isRange = x > 0 && y > 0 && x < widthLength-1 && y < heightLength-1;
      const baseColor = blockColors[state.blockMap[y][x]] ?? DEFAULT_COLOR;

      const diffWidth = isRange ? state.map[y][x-1] - state.map[y][x+1] : 0;
      const diffHeight = isRange ? state.map[y-1][x] - state.map[y+1][x] : 0;

      const shade = -(diffWidth + diffHeight);
      const brightness = 1 + shade * 0.02;

      const r = clamp(baseColor[0] * brightness);
      const g = clamp(baseColor[1] * brightness);
      const b = clamp(baseColor[2] * brightness);

      ctx.fillStyle = `rgb(${r},${g},${b})`;

      const px = x * size + state.camX;
      const py = y * size + state.camY;

      ctx.fillRect(px, py, size, size);
      
      const layer = state.layerMap[y][x];
      if(layer){
        const c = layerColors[layer];
        if(c){
          ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},0.35)`;
          ctx.fillRect(px, py, size, size);
        }
      }

      const h = state.map[y][x];

      if (x < widthLength - 1) {
        const right = state.map[y][x+1];
        if (Math.floor(h/contour) !== Math.floor(right/contour)) {

          ctx.beginPath();
          ctx.moveTo((x+1)*size + state.camX, y*size + state.camY);
          ctx.lineTo((x+1)*size + state.camX, (y+1)*size + state.camY);
          ctx.strokeStyle = "black";
          ctx.stroke();
        }
      }

      if (y < heightLength - 1) {
        const down = state.map[y+1][x];
        if (Math.floor(h/contour) !== Math.floor(down/contour)) {

          ctx.beginPath();
          ctx.moveTo(x*size + state.camX, (y+1)*size + state.camY);
          ctx.lineTo((x+1)*size + state.camX, (y+1)*size + state.camY);
          ctx.strokeStyle = "black";
          ctx.stroke();
        }
      }
    }
  }
  drawChunkGrid(ctx, canvas, size);
  drawBrushPreview(canvas);
}