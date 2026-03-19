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
  const newWidth = newChunkX * chunkSize;
  const newHeight = newChunkZ * chunkSize;

  const newMap = Array.from({ length: newHeight }, (_, y) =>
    Array.from({ length: newWidth }, (_, x) =>
      (state.map[y] && state.map[y][x] !== undefined) ? state.map[y][x] : 0
    )
  );

  const newBlockMap = Array.from({ length: state.maxHeight }, (_, y) =>
    Array.from({ length: newHeight }, (_, z) =>
      Array.from({ length: newWidth }, (_, x) =>
        (state.blockMap[y] && state.blockMap[y][z] && state.blockMap[y][z][x] !== undefined)
          ? state.blockMap[y][z][x]
          : 0
      )
    )
  );

  const newLayerMap = Array.from({ length: newHeight }, (_, y) =>
    Array.from({ length: newWidth }, (_, x) =>
      (state.layerMap[y] && state.layerMap[y][x] !== undefined) ? state.layerMap[y][x] : null
    )
  );

  state.chunkLenX = newChunkX;
  state.chunkLenZ = newChunkZ;

  state.map = newMap;
  state.blockMap = newBlockMap;
  state.layerMap = newLayerMap;
}