import { state, chunkSize, brushState } from "./state.js";

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

    state.chunkLenX = newChunkX;
    state.chunkLenZ = newChunkZ;

    state.map = newMap;
    state.blockMap = newBlockMap;
    state.layerMap = newLayerMap;

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
  const topY = Math.floor(height);

  let currentDepth = 0;
  let layerIndex = 0;
  let layerRemaining = brushState.blockLayers [0].depth;

  for(let yy = topY; yy >= 0; yy--){
    if(layerRemaining <= 0){
      layerIndex++;
      layerRemaining = brushState.blockLayers [layerIndex]?.depth ?? Infinity;
    }

    const layer = brushState.blockLayers [layerIndex];
    state.blockMap[yy][y][x] = layer.block;

    layerRemaining--;
    currentDepth++;
  }

  for(let yy = topY + 1; yy < brushState.maxHeight; yy++){
    state.blockMap[yy][y][x] = 0;
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