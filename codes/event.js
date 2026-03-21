import {
  state,
  brushState,
  cellSize,
  blockColors,
  mapInit,
  blockMapInit,
  layerMapInit,
  treesStructures
} from "./state.js";

import { writeBloxdSchem, downloadSchems, convertChunks, growForest } from "./parser.js";
import { resizeMap, resizeHeight } from "./utils.js";

const brushImages = [
  "Circle Mountain 2.png",
  "Circle Mountain 3.png",
  "Circle Mountain 4.png",
  "Circle Mountain 5.png",
  "Cliff Mountain 1.png",
  "Cliff Mountain 2.png",
  "Cliff Mountain 3.png",
  "Cliff Mountain 4.png",
  "Desert Mountain 1.png",
  "Desert Mountain 2.png",
  "Desert Mountain 3.png",
  "Desert Mountain 4.png",
  "Desert Mountain 6.png",
  "Mountain 1.png",
  "Mountain 2.png",
  "Mountain 3.png",
  "Mountain 4.png",
  "Plateau 1.png",
  "Plateau 2.png",
  "Plateau 3.png",
  "Plateau 4.png",
  "Snow Mountain 1.png",
  "Snow Mountain 2.png",
  "Snow Mountain 3.png",
  "Snow Mountain 4.png",
  "Snow Mountain 5.png",
  "Terraced Mountain 2.png",
  "Terraced Mountain 3.png",
  "Terraced Mountain 4.png",
  "Terraced Mountain 6.png",
  "Terraced Mountain 7.png"
]

const canvas = document.getElementById("canvas");

const brushSizeBar = document.getElementById("brushSize");
const zoomSizeBar = document.getElementById("zoom");
const modeBar = document.getElementById("mode");
const selectBlockBar = document.getElementById("selectBlock");
const layerBar = document.getElementById("layer");
const brushBar = document.getElementById("brushType");

const newFileInput = document.getElementById("newFile");
const exportInput = document.getElementById("exportFile");

const fileNameInput = document.getElementById("volume");
const paletteSizeInput = document.getElementById("paletteSize");
const maxHeightInput = document.getElementById("maxHeight");
const waterLevelInput = document.getElementById("waterLevelHeight");

const restoreDefault = document.getElementById("restoreDefault");

function changeMode(e) {
  const name = e.currentTarget.id;
  state.mode = name;
  modeBar.textContent = `Mode: ${name}`;
}

function changeSelectLayer(e) {
  const name = e.currentTarget.id;
  state.selectedLayer = name;
  layerBar.textContent = `Layer: ${name}`;
}

async function loadBrush(filename) {
  return new Promise((resolve) => {
    const brushImg = new Image();
    brushImg.src = `brushes/${filename}`;
    brushImg.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = brushImg.width;
      canvas.height = brushImg.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(brushImg, 0, 0);
      const data = ctx.getImageData(0, 0, brushImg.width, brushImg.height).data;

      const normalized = [];
      for(let y=0; y<brushImg.height; y++){
        normalized[y] = [];
        for(let x=0; x<brushImg.width; x++){
          const idx = (y * brushImg.width + x) * 4;
          const r = data[idx];
          normalized[y][x] = 1 - r / 255;
        }
      }
      resolve({ filename, normalized });
    };
  });
}

async function loadAllBrushes(brushImages) {
  const container = document.getElementById("brushUI");
  const promises = brushImages.map(filename => loadBrush(filename));

  const results = await Promise.all(promises);
  const loadedBrushes = {};
  results.forEach(({ filename: name, normalized }) => {
    loadedBrushes[name] = normalized;

    const brushTitle = name.replace(/\.[^/.]+$/, "");
    const brushId = brushTitle.replace(/\s+/g, "_");

    const button = document.createElement("button");
    button.className = "BlockButton";
    button.title = brushTitle;
    button.id = brushId;

    const img = document.createElement("img");
    img.src = `brushes/${name}`;
    img.width = 24;
    button.appendChild(img);
    container.appendChild(button);

    button.addEventListener("click", () => {
      brushBar.textContent = `Brush: ${button.title}`;
      brushState.brushType = name;
      console.log(`${button.title} brush clicked`);
    });

    console.log(`Loaded brush: ${name}`);
  });

  brushState.loadedBrushes = loadedBrushes;
}

function applyWaterLevel(){
  const width = state.widthLength;
  const height = state.heightLength;
  const maxH = state.maxHeight;

  const waterId = 126;
  const waterLevel = state.waterLevel;

  for(let z = 0; z < height; z++){
    for(let x = 0; x < width; x++){
      for(let y = 0; y < maxH; y++){
        if(state.blockMap[y][z][x] === waterId){
          state.blockMap[y][z][x] = 0;
        }
      }
      for(let y = 0; y <= waterLevel; y++){
        if(y >= maxH) break;

        if(state.blockMap[y][z][x] === 0){
          state.blockMap[y][z][x] = waterId;
        }
      }
    }
  }

  for(let cy = 0; cy < state.chunkRows; cy++){
    for(let cx = 0; cx < state.chunkCols; cx++){
      state.dirtyChunks.add(`${cx},${cy}`);
    }
  }
}

export function eventInit() {
  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
      state.leftDown = true;
      if (state.mode === "flatten") {
        const size = cellSize * state.zoom;
        const cellX = Math.floor((e.offsetX - state.camX) / size);
        const cellY = Math.floor((e.offsetY - state.camY) / size);
        state.targetHeight = state.map[cellY][cellX];
      }
    }
    if (e.button === 1) {
      state.panning = true;
      state.panStartX = e.clientX;
      state.panStartY = e.clientY;
    }
    if (e.button === 2) state.rightDown = true;
  });

  window.addEventListener("mouseup", (e) => {
    if (e.button === 0) {
      if (state.mode === "flatten") state.targetHeight = null;
      state.leftDown = false;
    }
    if (e.button === 1) state.panning = false;
    if (e.button === 2) state.rightDown = false;
  });

  window.addEventListener("wheel", (e) => {
    if (e.shiftKey) {
      state.zoom += e.deltaY > 0 ? -0.1 : 0.1;
      state.zoom = Math.max(0.1, Math.min(4, state.zoom));
      zoomSizeBar.textContent = `Zoom: ${state.zoom.toFixed(2)}`;
      return;
    }

    state.brushRadius += e.deltaY > 0 ? -1 : 1;
    state.brushRadius = Math.max(1, Math.min(80, state.brushRadius));
    brushSizeBar.textContent = `Size: ${state.brushRadius}`;
  });

  canvas.addEventListener("mousemove", (e) => {
    state.mouseX = e.offsetX;
    state.mouseY = e.offsetY;

    if (!state.panning) return;

    const dx = e.clientX - state.panStartX;
    const dy = e.clientY - state.panStartY;

    state.camX += dx;
    state.camY += dy;

    state.panStartX = e.clientX;
    state.panStartY = e.clientY;
  });

  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  ["height", "flatten", "sprayPaint", "smooth", "layerPaint"].forEach(id => {
    document.getElementById(id).addEventListener("click", changeMode);
  });

  document.addEventListener("DOMContentLoaded", () => {
    ["layerFrost", "layerDeliciousForest", "layerPineForest"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", changeSelectLayer);
    });
  });

  Object.keys(blockColors).forEach(name => {
    const element = document.getElementById("block" + name[0].toUpperCase() + name.slice(1));
    if (element) element.addEventListener("click", () => {
      state.selectedBlock = name;
      selectBlockBar.textContent = `Block: ${name}`;
    });
  });

  newFileInput.addEventListener("click", (e) => {
    state.map = mapInit();
    state.blockMap = blockMapInit();
    state.layerMap = layerMapInit();
  });

  exportInput.addEventListener("click", () => {
    growForest(state, treesStructures.pine, 6); 
    const json = convertChunks(state);
    const result = writeBloxdSchem(json);
    downloadSchems(result);
  });

  fileNameInput.addEventListener("input", (e) => {
    state.fileName = e.target.value;
    console.log("fileName:", paletteSettings.fileName);
  });

  paletteSizeInput.addEventListener("input", (e) => {
    const newSize = parseInt(e.target.value) || 8;
    resizeMap(newSize, newSize);
    console.log("palette resized:", newSize, "width:", state.widthLength, "height:", state.heightLength);
  });
  
  maxHeightInput.addEventListener("input", (e) => {
    const value = parseInt(e.target.value) || 64;
    state.maxHeight = value;
    resizeHeight(value);
    console.log("maxHeight:", state.maxHeight);
  });

  waterLevelInput.addEventListener("input", (e)=>{
    const value = parseInt(e.target.value) || 0;
    state.waterLevel = value;
    applyWaterLevel();
    console.log("maxHeight:", state.waterLevel);
  })

  Object.keys(brushState).forEach(id => {
    const element = document.getElementById(id);
    if (!element) return;

    element.addEventListener("input", (e) => {
      const el = e.target;

      switch(el.type){
        case "checkbox":
          brushState[id] = el.checked;
          break;
        case "number":
        case "range":
          brushState[id] = parseFloat(el.value);
          break;
        default:
          brushState[id] = el.value;
      }
    });
  });
  loadAllBrushes(brushImages);

  restoreDefault.addEventListener("click", (e) => {
    brushBar.textContent = `Brush: default`;
    brushState.brushType = "default";
  })
}