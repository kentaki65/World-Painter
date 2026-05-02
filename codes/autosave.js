import { state } from "./state.js";
import { downloadJSON, importJSON } from "./parser.js";
import { redrawAllChunks } from "./utils.js";
let db;

const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = ".json";

fileInput.onchange = (e) => {
  const file = e.target.files[0];
  if (file) importJSON(file);
};

function openLoadDialog() {
  fileInput.click();
}

document.addEventListener("keydown", (e) => {
  const ctrl = e.ctrlKey || e.metaKey;
  if (!ctrl) return;

  const tag = document.activeElement.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;

  if (e.key === "s" || e.key === "S") {
    e.preventDefault();

    if (e.shiftKey) {
      downloadJSON(); // Ctrl+Shift+S → ファイル保存
    } else {
      quickSave(); // Ctrl+S → IndexedDB
    }
  }

  if (e.key === "o" || e.key === "O") {
    e.preventDefault();
    openLoadDialog(); // Ctrl+O → 読み込み
  }
});

export function initDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("terrainDB", 1);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      db.createObjectStore("saves", { keyPath: "id" });
    };

    req.onsuccess = () => {
      db = req.result;
      redrawAllChunks();
      resolve();
    };

    req.onerror = reject;
  });
}

export function saveToDB(data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("saves", "readwrite");
    const store = tx.objectStore("saves");

    store.put({
      id: "autosave",
      data,
      time: Date.now()
    });

    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
}

export function loadFromDB() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("saves", "readonly");
    const store = tx.objectStore("saves");
    const req = store.get("autosave");
    req.onsuccess = () => {
      resolve(req.result?.data || null);
    };
    req.onerror = reject;
  });
}

export async function quickSave() {
  const data = {
    map: state.map,
    topBlockMap: state.topBlockMap,
    layerMap: state.layerMap
  };

  await saveToDB(data);
  console.log("Auto Saved");
}

export function autoSave(){
  setInterval(async () => {
    await quickSave();
  }, 60000)
}
