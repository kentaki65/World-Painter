import {
  state,
  cellSize, widthLength, heightLength, maxHeight, contour, DEFAULT_COLOR,
  blockColors, layerColors, mapInit, blockMapInit, layerMapInit
} from "./state.js";

import { brush } from "./brush.js";
import { writeBloxdSchem, downloadSchems, convertChunks } from "./parser.js";

const canvas = document.getElementById("canvas");

const brushSizeBar = document.getElementById("brushSize");
const zoomSizeBar = document.getElementById("zoom");
const modeBar = document.getElementById("mode");
const selectBlockBar = document.getElementById("selectBlock");
const layerBar = document.getElementById("layer");

const newFileInput = document.getElementById("newFile");
const fileOpenInput = document.getElementById("openFile");
const exportInput = document.getElementById("exportFile");

function changeMode(e){
  const name = e.currentTarget.id;
  state.mode = name;
  modeBar.textContent = `Mode: ${name}`
}

function changeSelectLayer(e){
  const name = e.currentTarget.id;
  state.selectedLayer = name;
  layerBar.textContent = `Layer:${name}`;
}

export function eventInit(){
  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
      state.leftDown = true;

      if(state.mode === "flatten"){
        const size = cellSize * state.zoom;

        const cellX = Math.floor((e.offsetX - state.camX) / size);
        const cellY = Math.floor((e.offsetY - state.camY) / size);
        state.targetHeight = state.map[cellY][cellX];
      }
    }
    if(e.button === 1){
      state.panning = true;
      state.panStartX = e.clientX;
      state.panStartY = e.clientY;
    }
    if (e.button === 2) state.rightDown = true;
  });

  window.addEventListener("mouseup", (e) => {
    if (e.button === 0) {
      if(state.mode === "flatten") state.targetHeight = null;
      state.leftDown = false;
    }
    if(e.button === 1){
      state.panning = false;
    }
    if (e.button === 2) state.rightDown = false;
  });

  window.addEventListener("wheel", (e) => {
    if(e.shiftKey){
      const oldZoom = state.zoom;
      state.zoom += e.deltaY > 0 ? -0.1 : 0.1;
      state.zoom = Math.max(0.3, Math.min(4, state.zoom));
      zoomSizeBar.textContent = `Zoom: ${state.zoom.toFixed(2)}`;
      return;
    }

    state.brushRadius += e.deltaY > 0 ? -1 : 1;
    state.brushRadius = Math.max(1, Math.min(80, state.brushRadius));

    brushSizeBar.textContent = `Size: ${state.brushRadius}`;
  });

  canvas.addEventListener("mousemove", (e)=> {
    brush(e)
    if(!state.panning) return;

    const dx = e.clientX - state.panStartX;
    const dy = e.clientY - state.panStartY;

    state.camX += dx;
    state.camY += dy;

    state.panStartX = e.clientX;
    state.panStartY = e.clientY;
  });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  ["height","flatten","sprayPaint","smooth","layerPaint"].forEach(id => {
    document.getElementById(id).addEventListener("click", changeMode);
  })

  document.addEventListener("DOMContentLoaded", () => {
    ["layerFrost","layerDeliciousForest","layerPineForest"].forEach(id => {
      const el = document.getElementById(id);
      if(el) el.addEventListener("click", changeSelectLayer);
    });
  });

  Object.keys(blockColors).forEach(name => {
    const element = document.getElementById("block" + name[0].toUpperCase() + name.slice(1));
    if(element) element.addEventListener("click", () => {
      state.selectedBlock = name;
      selectBlockBar.textContent = `Block: ${name}`;
    });
  });

  newFileInput.addEventListener("click", (e)=>{
    state.map = mapInit();
    state.blockMap = blockMapInit();
    state.layerMap = layerMapInit();
  })

  exportInput.addEventListener("click", () => {
    const initialMap = mapInit().map(row => row.slice());
    const initialBlockMap = blockMapInit().map(row => row.slice());

    const json = convertChunks(state);
    const result = writeBloxdSchem(json);
    downloadSchems(result);
  })
};