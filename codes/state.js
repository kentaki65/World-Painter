export const chunkSize = 32;
export const cellSize = 10;

export const contour = 5;
export const DEFAULT_COLOR = [255,0,255];

export const blockColors = {
  "Air": [144, 215, 236],
  "Dirt": [120, 85, 60],
  "Grass Block": [20,120,40],
  "Sand": [200,190,120],
  "Stone": [120,120,120],
  "Messy Stone": [110,110,110],
  "Gravel": [130,130,130],
  "Clay": [150,160,170],
  "Andesite": [140,140,145],
  "Diorite": [210,210,210],
  "Granite": [150,110,100],
  "Snow": [240,240,240],
  "Water": [135, 206, 235]
};

export const layerColors = {
  layerDeliciousForest: [30,90,40],
  layerPineForest: [40,110,50]
};

export const treesStructures = {
  pine: [
    [
      [0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0]
    ],
    [
      [0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0]
    ],
    [
      [0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,491,0,0,0],[0,491,491,491,0,0],[0,0,491,0,0,0],[0,0,491,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0]
    ],
    [
      [0,0,0,0,0,0],[0,0,0,0,0,0],[0,491,491,491,0,0],[491,491,491,491,491,0],[0,491,491,491,0,0],[0,491,491,491,0,0],[0,0,491,0,0,0],[0,0,491,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0]
    ],
    [
      [0,0,12,0,0,0],[0,0,12,0,0,0],[491,491,12,491,491,0],[491,491,12,491,491,0],[491,491,12,491,491,0],[491,491,12,491,491,0],[0,491,491,491,0,0],[0,491,491,491,0,0],[0,0,491,0,0,0],[0,0,491,0,0,0]
    ],
    [
      [0,0,0,0,0,0],[0,0,0,0,0,0],[0,491,491,491,0,0],[491,491,491,491,491,0],[0,491,491,491,0,0],[0,491,491,491,0,0],[0,0,491,0,0,0],[0,0,491,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0]
    ],
    [
      [0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,491,0,0,0],[0,491,491,491,0,0],[0,0,491,0,0,0],[0,0,491,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0]
    ]
  ]
}

export const state = {
  // サイズ系
  chunkLenX: 4,
  chunkLenZ: 4,
  maxHeight: 64,

  //マップ
  map: null,
  blockMap: null,
  layerMap: null,
  fileName: "schem",
  waterLevel: 10,

  // 編集系
  leftDown: false,
  rightDown: false,
  brushRadius: 3,
  mouseX: 0,
  mouseY: 0,
  camX: 0,
  camY: 0,
  zoom: 1,
  panning: false,
  panStartX: 0,
  panStartY: 0,
  mode: "height",
  targetHeight: null,
  selectedBlock: "Grass Block",
  selectedLayer: "layerPineForest",

  chunkCols: 0,
  chunkRows: 0,
  chunkCanvas: null,
  dirtyChunks: new Set(),

  get widthLength() { return this.chunkLenX * chunkSize; },
  get heightLength() { return this.chunkLenZ * chunkSize; }
};

export function initChunks(){
  state.chunkCols = Math.ceil(state.widthLength / chunkSize);
  state.chunkRows = Math.ceil(state.heightLength / chunkSize);

  state.chunkCanvas = Array.from({ length: state.chunkRows }, () =>
    Array.from({ length: state.chunkCols }, () => null)
  );

  state.dirtyChunks.clear();

  for(let cy = 0; cy < state.chunkRows; cy++){
    for(let cx = 0; cx < state.chunkCols; cx++){
      state.dirtyChunks.add(`${cx},${cy}`);
    }
  }
}

export const mapInit = () =>
  Array.from({ length: state.heightLength }, () =>
    new Array(state.widthLength).fill(0)
  );

export const blockMapInit = () =>
  Array.from({ length: state.maxHeight }, () =>
    Array.from({ length: state.heightLength }, () =>
      new Array(state.widthLength).fill(0)
    )
  );

export const layerMapInit = () =>
  Array.from({ length: state.heightLength }, () =>
    new Array(state.widthLength).fill(null)
  );

export function initMaps() {
  state.map = mapInit();
  state.blockMap = blockMapInit();
  state.layerMap = layerMapInit();
}