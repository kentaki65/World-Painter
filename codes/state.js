export const chunkSize = 32;
export const cellSize = 10;

export const contour = 5;
export const DEFAULT_COLOR = [255,0,255];

export const blockColors = {
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
  "Snow": [240,240,240]
};

export const layerColors = {
  layerDeliciousForest: [30,90,40],
  layerPineForest: [40,110,50]
};

export const treesStructures = {
  pine: [
    [
      [0,0,0,0,0,1510],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0]
    ],
    [
      [0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0]
    ],
    [
      [0,0,0,0,2,0],[0,0,0,0,0,0],[0,0,491,0,0,0],[0,491,491,491,0,0],[0,0,491,0,0,0],[0,0,491,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0]
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
      [0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,491,0,0,0],[0,491,491,491,0,0],[0,0,491,0,0,0],[0,0,491,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[2,0,0,0,0,0]
    ]
  ]
}
export const state = {
  // サイズ系
  chunkLenX: 4,
  chunkLenZ: 4,
  get widthLength() { return this.chunkLenX * chunkSize; },
  get heightLength() { return this.chunkLenZ * chunkSize; },
  maxHeight: 64,

  //マップ
  map: null,
  blockMap: null,
  layerMap: null,
  fileName: "schem",

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
  selectedLayer: "layerPineForest"
};

export const mapInit = () =>
  Array.from({ length: state.heightLength }, () =>
    new Array(state.widthLength).fill(0)
  );

export const blockMapInit = () =>
  Array.from({ length: state.heightLength }, () =>
    new Array(state.widthLength).fill("Grass Block")
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