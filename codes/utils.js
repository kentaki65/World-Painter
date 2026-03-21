import { state, chunkSize } from "./state.js";

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

export function resizeMap(newChunkX, newChunkZ) {
  const oldCols = state.chunkCols;
  const oldRows = state.chunkRows;

  const newWidth = newChunkX * chunkSize;
  const newHeight = newChunkZ * chunkSize;

  const oldMap = state.map;
  const oldBlockMap = state.blockMap;
  const oldLayerMap = state.layerMap;

  const newMap = Array.from({ length: newHeight }, (_, y) =>
    Array.from({ length: newWidth }, (_, x) =>
      (oldMap[y] && oldMap[y][x] !== undefined) ? oldMap[y][x] : 0
    )
  );

  const newBlockMap = Array.from({ length: state.maxHeight }, (_, y) =>
    Array.from({ length: newHeight }, (_, z) =>
      Array.from({ length: newWidth }, (_, x) =>
        (oldBlockMap[y] && oldBlockMap[y][z] && oldBlockMap[y][z][x] !== undefined)
          ? oldBlockMap[y][z][x]
          : 0
      )
    )
  );

  const newLayerMap = Array.from({ length: newHeight }, (_, y) =>
    Array.from({ length: newWidth }, (_, x) =>
      (oldLayerMap[y] && oldLayerMap[y][x] !== undefined)
        ? oldLayerMap[y][x]
        : null
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
    Array.from({ length: newCols }, (_, cx) => {
      if (cy < oldRows && cx < oldCols) {
        return state.chunkCanvas[cy][cx];
      }
      return null;
    })
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
}

export function resizeHeight(newMaxHeight){
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
}