import { state, brushState, chunkSize, cellSize, stackState } from "./state.js";
import { heightClamp, lerp, applyColumnChanges } from "./utils.js";
import { nameToId } from "./nameMap.js";

let currentStroke = null;
let strokeMap = null;

export function beginStroke() {
  currentStroke = [];
  strokeMap = new Map();
}

export function endStroke() {
  if (!strokeMap || strokeMap.size === 0) return;

  currentStroke = Array.from(strokeMap.values());

  stackState.undoStack.push(currentStroke);
  if (stackState.undoStack.length > stackState.MAX_HISTORY) {
    stackState.undoStack.shift();
  }

  stackState.redoStack.length = 0;

  currentStroke = null;
  strokeMap = null;
}

function recordChange(x, y, before, after, type = "height") {
  const key = `${type}:${x},${y}`;

  if (!strokeMap || !strokeMap.has(key)) {
    strokeMap.set(key, { x, y, before, after, type });
  } else {
    strokeMap.get(key).after = after;
  }
}

function markDirty(x, y) {
  const cx = (x / chunkSize) | 0;
  const cy = (y / chunkSize) | 0;
  state.dirtyChunks.add(`${cx},${cy}`);
}

function normalBrush(cellX, cellY) {
  const r = state.brushRadius;
  const changed = new Set();

  const brushData =
    brushState.brushType !== "default"
      ? brushState.loadedBrushes[brushState.brushType]
      : null;

  const brushWidth = brushData ? brushData[0].length : 0;
  const brushHeight = brushData ? brushData.length : 0;

  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = cellX + dx;
      const y = cellY + dy;
      if (x < 0 || y < 0 || x >= state.widthLength || y >= state.heightLength) continue;

      const distance = Math.hypot(dx, dy);
      if (distance > r) continue;

      const oldH = state.map[y][x];
      const normalized = Math.pow(1 - distance / r, 2);

      let strength = normalized;
      if (brushData) {
        const imgX = Math.floor(((dx + r) / (2 * r)) * brushWidth);
        const imgY = Math.floor(((dy + r) / (2 * r)) * brushHeight);
        const brushStrength = brushData[imgY]?.[imgX] ?? 0;
        strength *= brushStrength;
      }

      let newH = oldH;

      if (state.leftDown) {
        if (state.mode === "flatten" && state.targetHeight !== null) {
          newH = heightClamp(lerp(oldH, state.targetHeight, 0.08 * strength));
        } else {
          newH = heightClamp(oldH + (r - distance) * 0.03 * strength);
        }
      } else if (state.rightDown) {
        if (state.mode !== "flatten") {
          newH = heightClamp(oldH - (r - distance) * 0.03 * strength);
        }
      }

      if (brushState.atOrAboveEnabled && newH < brushState.orAboveRangeInput) continue;
      if (brushState.atOrBelowEnabled && newH > brushState.atOrBelowRangeInput) continue;

      if (oldH === newH) continue;

      recordChange(x, y, oldH, newH, "height");

      state.map[y][x] = newH;
      changed.add(`${x},${y}`);
      markDirty(x, y);
    }
  }

  applyColumnChanges(changed);
}

function smoothBrush(cellX, cellY) {
  const r = state.brushRadius;
  const changed = new Set();

  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = cellX + dx;
      const y = cellY + dy;

      if (x < 1 || y < 1 || x >= state.widthLength - 1 || y >= state.heightLength - 1) continue;
      if (dx * dx + dy * dy > r * r) continue;

      const oldH = state.map[y][x];

      const avg =
        (oldH +
          state.map[y][x - 1] +
          state.map[y][x + 1] +
          state.map[y - 1][x] +
          state.map[y + 1][x]) /
        5;

      const strength = 0.5 * (1 - (dx * dx + dy * dy) / (r * r));
      const newH = heightClamp(lerp(oldH, avg, strength));

      if (oldH === newH) continue;

      recordChange(x, y, oldH, newH, "height");

      state.map[y][x] = newH;
      changed.add(`${x},${y}`);
      markDirty(x, y);
    }
  }

  applyColumnChanges(changed);
}

function sprayBrush(cellX, cellY) {
  const density = state.brushRadius * 3;
  const changed = new Set();

  for (let i = 0; i < density; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * state.brushRadius;

    const dx = Math.round(Math.cos(angle) * radius);
    const dz = Math.round(Math.sin(angle) * radius);

    const x = cellX + dx;
    const z = cellY + dz;

    if (x < 0 || z < 0 || x >= state.widthLength || z >= state.heightLength) continue;
    if (!state.leftDown) continue;

    const oldBlock = state.topBlockMap[z][x];
    const newBlock = nameToId[state.selectedBlock];

    if (oldBlock === newBlock) continue;

    recordChange(x, z, oldBlock, newBlock, "block");

    state.topBlockMap[z][x] = newBlock;
    changed.add(`${x},${z}`);
    markDirty(x, z);
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

      const oldLayer = state.layerMap[y][x];
      const newLayer = state.leftDown ? state.selectedLayer : null;

      if (oldLayer === newLayer) continue;

      recordChange(x, y, oldLayer, newLayer, "layer");

      state.layerMap[y][x] = newLayer;
      markDirty(x, y);
    }
  }
}

function noiseBrush(cellX, cellY) {
  const r = state.brushRadius;

  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = cellX + dx;
      const y = cellY + dy;

      if (x < 0 || y < 0 || x >= state.widthLength || y >= state.heightLength) continue;
      if (dx*dx + dy*dy > r*r) continue;

      const oldH = state.map[y][x];

      const raw = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const n = (raw - Math.floor(raw)) * 2 - 1; // -1〜1

      const falloff = 1 - (dx*dx + dy*dy)/(r*r);
      const strength = 0.2 * falloff;

      const newH = heightClamp(oldH + n * strength * 1.1);

      state.map[y][x] = newH;
      markDirty(x, y);
    }
  }
}

export function applyBrush() {
  const size = cellSize * state.zoom;
  const cellX = Math.floor((state.mouseX - state.camX) / size);
  const cellY = Math.floor((state.mouseY - state.camY) / size);

  if (
    cellX < 0 ||
    cellY < 0 ||
    cellX >= state.widthLength ||
    cellY >= state.heightLength
  )
    return;

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
    case "noise":
      noiseBrush(cellX, cellY);
      break;
    default:
      normalBrush(cellX, cellY);
  }
}