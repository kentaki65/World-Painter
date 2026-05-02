import { state } from "./state.js";
import { redrawAllChunks } from "./utils.js";
let db;

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