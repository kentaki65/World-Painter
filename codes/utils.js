import { state, chunkSize, brushState, stackState } from "./state.js";

export const clamp = (v) => {
  return Math.max(0, Math.min(255, v));
}

export const heightClamp = (v) => {
  return Math.max(0, Math.min(state.maxHeight, v));
}

export const lerp = (a, b, t) => { 
  return a + (b - a) * t; 
}

export function getTopBlock(x, z) {
  const height = Math.floor(state.map[z][x]);

  if (height < 0 || height >= state.maxHeight) return 0;

  return state.blockMap[height][z][x];
}

export async function runLoading(fn){
  showLoading();
  await new Promise(r => setTimeout(r, 0));
  try{
    await fn();
  } finally {
    hideLoading();
  }
}

export async function resizeMap(newChunkX, newChunkZ) {
  await runLoading(async () => {

    const oldCols = state.chunkCols;
    const oldRows = state.chunkRows;

    const newWidth = newChunkX * chunkSize;
    const newHeight = newChunkZ * chunkSize;

    const oldMap = state.map;
    const oldBlockMap = state.blockMap;
    const oldLayerMap = state.layerMap;

    const newMap = Array.from({ length: newHeight }, (_, y) =>
      Array.from({ length: newWidth }, (_, x) =>
        oldMap[y]?.[x] ?? 0
      )
    );

    const newBlockMap = Array.from({ length: state.maxHeight }, (_, y) =>
      Array.from({ length: newHeight }, (_, z) =>
        Array.from({ length: newWidth }, (_, x) =>
          oldBlockMap[y]?.[z]?.[x] ?? 0
        )
      )
    );

    const newLayerMap = Array.from({ length: newHeight }, (_, y) =>
      Array.from({ length: newWidth }, (_, x) =>
        oldLayerMap[y]?.[x] ?? null
      )
    );

    const newTopBlockMap = Array.from({ length: newHeight }, (_, z) =>
      Array.from({ length: newWidth }, (_, x) =>
        oldMap[z]?.[x] != null
          ? state.topBlockMap[z]?.[x] ?? 4
          : 4
      )
    );

    state.chunkLenX = newChunkX;
    state.chunkLenZ = newChunkZ;

    state.map = newMap;
    state.blockMap = newBlockMap;
    state.layerMap = newLayerMap;
    state.topBlockMap = newTopBlockMap;

    const newCols = Math.ceil(newWidth / chunkSize);
    const newRows = Math.ceil(newHeight / chunkSize);

    const newChunkCanvas = Array.from({ length: newRows }, (_, cy) =>
      Array.from({ length: newCols }, (_, cx) =>
        (cy < oldRows && cx < oldCols)
          ? state.chunkCanvas[cy][cx]
          : null
      )
    );

    state.chunkCanvas = newChunkCanvas;
    state.chunkCols = newCols;
    state.chunkRows = newRows;

    state.dirtyChunks.clear();

    for (let cy = 0; cy < newRows; cy++) {
      for (let cx = 0; cx < newCols; cx++) {
        if (cy >= oldRows || cx >= oldCols) {
          state.dirtyChunks.add(`${cx},${cy}`);
        }
      }
    }

  });
}

export async function resizeHeight(newMaxHeight){
  await runLoading(async () => {

    const old = state.blockMap;
    const width = state.widthLength;
    const height = state.heightLength;

    const newMap3D = Array.from({ length: newMaxHeight }, (_, y) =>
      Array.from({ length: height }, (_, z) =>
        Array.from({ length: width }, (_, x) =>
          old[y]?.[z]?.[x] ?? 0
        )
      )
    );

    // 高さクランプ
    for(let z = 0; z < height; z++){
      for(let x = 0; x < width; x++){
        if(state.map[z][x] >= newMaxHeight){
          state.map[z][x] = newMaxHeight - 1;
        }
      }
    }

    state.maxHeight = newMaxHeight;
    state.blockMap = newMap3D;

    for(let cy = 0; cy < state.chunkRows; cy++){
      for(let cx = 0; cx < state.chunkCols; cx++){
        state.dirtyChunks.add(`${cx},${cy}`);
      }
    }

  });
}

export function rebuildColumn(x, y, height){
  const column = state.blockMap;
  const safeTop = Math.min(state.maxHeight - 1, height | 0);

  let layerIndex = 0;
  let remaining = brushState.blockLayers[0].depth;
  let currentBlock = brushState.blockLayers[0].block;

  // 下方向
  for(let yy = safeTop; yy >= 0; yy--){
    if(remaining <= 0){
      layerIndex++;
      const next = brushState.blockLayers[layerIndex];
      currentBlock = next?.block ?? currentBlock;
      remaining = next?.depth ?? Infinity;
    }

    // 同じならスキップ
    if(column[yy][y][x] !== currentBlock){
      column[yy][y][x] = currentBlock;
    }

    remaining--;
  }

  // 上方向
  for(let yy = safeTop + 1; yy < state.maxHeight; yy++){
    if(column[yy][y][x] !== 0){
      column[yy][y][x] = 0;
    }
  }

  // トップ上書き
  const override = state.topBlockMap[y]?.[x];
  if (override != null && column[safeTop][y][x] !== override) {
    column[safeTop][y][x] = override;
  }
}

export function applyColumnChanges(changed){
  for (const key of changed) {
    const [x, y] = key.split(",").map(Number);

    rebuildColumn(x, y, state.map[y][x]);

    const ccx = (x / chunkSize)|0;
    const ccy = (y / chunkSize)|0;
    state.dirtyChunks.add(`${ccx},${ccy}`);
  }
}

export function showLoading() {
  document.getElementById("loadingOverlay").style.display = "flex";
}

export function hideLoading() {
  document.getElementById("loadingOverlay").style.display = "none";
}

export function beginStroke(){
  if(state.currentStroke) return; 
  state.currentStroke = {
    ops: []
  };
}

export function recordChange(x, y, before, after){
  if(!state.currentStroke) return;
  state.currentStroke.ops.push({ x, y, before, after });
}

export function endStroke(){
  const stroke = state.currentStroke;
  if(!stroke) return;

  if (stroke.ops.length > 0) {
    stackState.undoStack.push(stroke);

    if (stackState.undoStack.length > stackState.MAX_HISTORY) {
      stackState.undoStack.shift();
    }

    stackState.redoStack.length = 0;
  }

  state.currentStroke = null;
}

export function setCell(x, y, value) {
  const before = state.map[y][x];
  if (before === value) return;

  recordChange(x, y, before, value);

  state.map[y][x] = value;

  rebuildColumn(x, y, value);
  updateTopBlock(x, y);
  markChunkDirty(x, y);
}

export function undo(){
  const stroke = stackState.undoStack.pop();
  if(!stroke) return;

  stackState.redoStack.push(stroke);

  for(const op of stroke.ops){
    state.map[op.y][op.x] = op.before;

    rebuildColumn(op.x, op.y, op.before);
    updateTopBlock(op.x, op.y);
    markChunkDirty(op.x, op.y);
  }
}

export function redo(){
  const stroke = stackState.redoStack.pop();
  if(!stroke) return;

  stackState.undoStack.push(stroke);

  for(const op of stroke.ops){
    state.map[op.y][op.x] = op.after;

    rebuildColumn(op.x, op.y, op.after);
    updateTopBlock(op.x, op.y);
    markChunkDirty(op.x, op.y);
  }
}
function updateTopBlock(x, z) {
  for (let y = state.maxHeight - 1; y >= 0; y--) {
    const b = state.blockMap[y][z][x];
    if (b !== 0 && b !== null) {
      state.topBlockMap[z][x] = b;
      return;
    }
  }
  state.topBlockMap[z][x] = 0;
}

function markChunkDirty(x, y) {
  const cx = Math.floor(x / chunkSize);
  const cy = Math.floor(y / chunkSize);
  state.dirtyChunks.add(`${cx},${cy}`);
}