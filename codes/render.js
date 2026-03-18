import {
  state,
  cellSize, widthLength, heightLength, maxHeight, contour, DEFAULT_COLOR,
  blockColors, layerColors,
} from "./state.js";

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

export function draw(canvas){
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const size = cellSize * state.zoom;

  const startX = Math.max(0, Math.floor(-state.camX / size));
  const startY = Math.max(0, Math.floor(-state.camY / size));
  const endX = Math.min(widthLength, Math.ceil((canvas.width - state.camX) / size));
  const endY = Math.min(heightLength, Math.ceil((canvas.height - state.camY) / size));

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {

      const h = state.map[y][x];
      const baseColor = blockColors[state.blockMap[y][x]] ?? DEFAULT_COLOR;

      const isRange = x > 0 && y > 0 && x < widthLength-1 && y < heightLength-1;

      const diffWidth = isRange ? state.map[y][x-1] - state.map[y][x+1] : 0;
      const diffHeight = isRange ? state.map[y-1][x] - state.map[y+1][x] : 0;

      const brightness = 1 + (-(diffWidth + diffHeight)) * 0.02;

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
          ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},0.35)`;
          ctx.fillRect(px, py, size, size);
        }
      }

      const level = (h / contour) | 0;

      if (x < widthLength - 1) {
        const rightLevel = (state.map[y][x+1] / contour) | 0;
        if (level !== rightLevel) {
          ctx.beginPath();
          ctx.moveTo((x+1)*size + state.camX, y*size + state.camY);
          ctx.lineTo((x+1)*size + state.camX, (y+1)*size + state.camY);
          ctx.strokeStyle = "black";
          ctx.stroke();
        }
      }

      if (y < heightLength - 1) {
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
}