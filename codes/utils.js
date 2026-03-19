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

export function resizeMap(newChunkX, newChunkZ) {
  const newWidth = newChunkX * chunkSize;
  const newHeight = newChunkZ * chunkSize;

  const newMap = Array.from({ length: newHeight }, (_, y) =>
    Array.from({ length: newWidth }, (_, x) =>
      (state.map[y] && state.map[y][x] !== undefined) ? state.map[y][x] : 0
    )
  );

  const newBlockMap = Array.from({ length: newHeight }, (_, y) =>
    Array.from({ length: newWidth }, (_, x) =>
      (state.blockMap[y] && state.blockMap[y][x] !== undefined) ? state.blockMap[y][x] : "Grass Block"
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

export function placeStructureAt(x, z, structure){
  const baseY = state.map[z][x];

  const sizeZ = structure.length;
  const sizeY = structure[0].length;
  const sizeX = structure[0][0].length;

  const offsetX = Math.floor(sizeX / 2);
  const offsetZ = Math.floor(sizeZ / 2);

  for(let dz = 0; dz < sizeZ; dz++){
    for(let dy = 0; dy < sizeY; dy++){
      for(let dx = 0; dx < sizeX; dx++){

        const id = structure[dz][dy][dx];
        if(id === 0) continue; 

        const wx = x + dx - offsetX;
        const wy = baseY + dy;
        const wz = z + dz - offsetZ;

        if(
          wx < 0 || wz < 0 ||
          wx >= state.widthLength ||
          wz >= state.heightLength ||
          wy >= state.maxHeight
        ) continue;

        state.map[wz][wx] = Math.max(state.map[wz][wx], wy + 1);
        state.blockMap[wz][wx] = id;
      }
    }
  }
}

export function applyLayerStructures(){
  for(let z = 0; z < state.heightLength; z++){
    for(let x = 0; x < state.widthLength; x++){
      if(state.layerMap[z][x] === "pineForest"){
        if(Math.random() < 0.1){
          placeStructureAt(x, z, structures.pine);
        }
      }
    }
  }
}