const chunkSize = 32;
export const chunkLenX = 14;
export const chunkLenZ = 14;

export const cellSize = 10;
export const widthLength = chunkSize*chunkLenX;
export const heightLength = chunkSize*chunkLenZ;
export const maxHeight = 64;
export const contour = 5;
export const DEFAULT_COLOR = [255,0,255];

export const blockColors = {
  dirt: [120, 85, 60],
  grass: [20,120,40],
  sand: [200,190,120],
  redSand: [190,110,70],
  stone: [120,120,120],
  messyStone: [110,110,110],
  gravel: [130,130,130],
  clay: [150,160,170],
  andesite: [140,140,145],
  diorite: [210,210,210],
  granite: [150,110,100],
  snow: [240,240,240]
};

export const layerColors = {
  frost: [220,240,255],
  pineForest: [30,90,40],
  deliciousForest: [40,110,50]
};

export const mapInit = () =>
  Array.from({ length: heightLength }, () => new Array(widthLength).fill(0));

export const blockMapInit = () =>
  Array.from({ length: heightLength }, () => new Array(widthLength).fill("grass"));

export const layerMapInit = () =>
  Array.from({ length: heightLength }, () => Array(widthLength).fill(null));

export const state = {
  map: mapInit(),
  blockMap: blockMapInit(),
  layerMap: layerMapInit(),

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
  selectedBlock: "stone",
  selectedLayer: "frost"
};