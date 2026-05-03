import avro from "https://esm.sh/avsc@5.7.9";
import { Buffer } from "https://esm.sh/buffer";
import { nameToId } from "./nameMap.js";
import { state, treesStructures } from "./state.js";

const schema0 = avro.Type.forSchema({
	type: "record",
	name: "Schematic",
	fields: [
		{ name: 'headers', type: { type: 'fixed', size: 4 }, default: "\u{0}\u{0}\u{0}\u{0}" },
		{ name: "name", type: "string" },
		{ name: "x", type: "int" },
		{ name: "y", type: "int" },
		{ name: "z", type: "int" },
		{ name: "sizeX", type: "int" },
		{ name: "sizeY", type: "int" },
		{ name: "sizeZ", type: "int" },
		{
			name: "chunks",
			type: {
				type: "array",
				items: {
					type: "record",
					fields: [
						{ name: "x", type: "int" },
						{ name: "y", type: "int" },
						{ name: "z", type: "int" },
						{ name: "blocks", type: "bytes" }
					]
				}
			}
		}
	]
});

function getMaxUsedHeight(state) {
	let max = 0;
	for (let z = 0; z < state.heightLength; z++) {
		for (let x = 0; x < state.widthLength; x++) {
			const h = state.map[z][x];
			if (h > max) max = h;
		}
	}
	return max;
}

export function growForest(state, pine, spacing = 8){
  const width = state.widthLength;
  const height = state.heightLength;

  const patternHeight = pine.length;     
  const patternDepth = pine[0].length;   
  const patternWidth = pine[0][0].length;

  const centerPX = Math.floor(patternWidth / 2);
  const centerPZ = Math.floor(patternDepth / 2);

  for(let z = 0; z < height; z += spacing){
    for(let x = 0; x < width; x += spacing){
      const nx = x + Math.floor(Math.random() * (spacing/2)) - Math.floor(spacing/4);
      const nz = z + Math.floor(Math.random() * (spacing/2)) - Math.floor(spacing/4);

      if(nx < 0 || nz < 0 || nx + patternWidth > width || nz + patternDepth > height) continue;

      const cx = nx + centerPX;
      const cz = nz + centerPZ;

      if(!state.layerMap[cz][cx] || state.layerMap[cz][cx] !== state.selectedLayer) continue;

      let centerYTop = -1;
      for(let y = state.maxHeight - 1; y >= 0; y--){
        if(state.blockMap[y][cz][cx] !== 0){
          centerYTop = y;
          break;
        }
      }
      const surfaceHeight = Math.floor(state.map[cz][cx] || 0);
      const yStart = Math.max(surfaceHeight, centerYTop + 1);

      for(let py = 0; py < patternHeight; py++){    
        for(let pz = 0; pz < patternDepth; pz++){   
          for(let px = 0; px < patternWidth; px++){ 
            const blockId = pine[py][pz][px];
            if(blockId === 0) continue;

            const wx = nx + px;    
            const wz = nz + py;    
            const wy = yStart + pz;

            if(wx < 0 || wz < 0 || wx >= width || wz >= height || wy >= state.maxHeight) continue;
            if(!state.layerMap[wz][wx] || state.layerMap[wz][wx] !== state.selectedLayer) continue;
            state.blockMap[wy][wz][wx] = blockId;
          }
        }
      }
    }
  }
}

function convertChunks(state) {
  const chunks = [];
  const chunkSize = 32;
  const chunkCountX = state.chunkLenX;
  const chunkCountZ = state.chunkLenZ;
  const maxUsedHeight = getMaxUsedHeight(state);
  const chunkCountY = Math.ceil(maxUsedHeight / chunkSize);

  for (let cx = 0; cx < chunkCountX; cx++) {
    for (let cz = 0; cz < chunkCountZ; cz++) {
      for (let cy = 0; cy < chunkCountY; cy++) {
        const blocks = [];

        for (let x = 0; x < chunkSize; x++) {
          for (let y = 0; y < chunkSize; y++) { // Yは高さ
            for (let z = 0; z < chunkSize; z++) {
              const wx = cx * chunkSize + x;
              const wz = cz * chunkSize + z;
              const wy = cy * chunkSize + y;
              let id = 0;

              if (wx < state.widthLength && wz < state.heightLength && wy < state.maxHeight) {
                const surfaceBlock = state.blockMap[wy]?.[wz]?.[wx];
                if (surfaceBlock && surfaceBlock !== 0) {
                  id = surfaceBlock;
                } else {
                  const height = Math.floor(state.map[wz][wx]);
                  if (wy > height) {
                    id = 0; // 空気
                  } else if (wy === height) {
                    id = 1; // 草
                  } else if (wy >= height - 3) {
                    id = nameToId.Dirt;
                  } else {
                    id = nameToId.Stone;
                  }
                }
              }

              blocks.push(id);
            }
          }
        }

        chunks.push({ x: cx, y: cy, z: cz, blocks });
      }
    }
  }
  let minCX = Infinity, minCY = Infinity, minCZ = Infinity;
  let maxCX = -Infinity, maxCY = -Infinity, maxCZ = -Infinity;

  for (const c of chunks) {
    if (c.x < minCX) minCX = c.x;
    if (c.y < minCY) minCY = c.y;
    if (c.z < minCZ) minCZ = c.z;
    if (c.x > maxCX) maxCX = c.x;
    if (c.y > maxCY) maxCY = c.y;
    if (c.z > maxCZ) maxCZ = c.z;
  }

  for (const c of chunks) {
    c.x -= minCX;
    c.y -= minCY;
    c.z -= minCZ;
  }

  const sizeX = (maxCX - minCX + 1) * chunkSize;
  const sizeY = (maxCY - minCY + 1) * chunkSize;
  const sizeZ = (maxCZ - minCZ + 1) * chunkSize;

  return {
    name: state.fileName || "schem",
    pos: [0, 0, 0],
    size: [sizeX, sizeY, sizeZ],
    chunks
  };
}

function convertTo3D(avroJson) {
	const chunkSize = 32
	const result = {
		name: avroJson.name,
		size: [avroJson.sizeX, avroJson.sizeY, avroJson.sizeZ],
		blocks: [],
	}
	for (const chunk of avroJson.chunks) {
		const decoded = decodeBlocks(chunk)

		let i = 0
		for (let x = 0; x < chunkSize; x++) {
			for (let y = 0; y < chunkSize; y++) {
				for (let z = 0; z < chunkSize; z++) {
					const id = decoded[i++]
					if (id === 0) continue
					const wx = chunk.x * chunkSize + x
					const wy = chunk.y * chunkSize + y
					const wz = chunk.z * chunkSize + z
					result.blocks.push({
						x: wx,
						y: wy,
						z: wz,
						id
					})
				}
			}
		}	
	}
	return result;
}

function applyParsed(result) {
  for (const b of result.blocks) {
    if (
      b.x < 0 || b.z < 0 ||
      b.x >= state.widthLength ||
      b.z >= state.heightLength ||
      b.y >= state.maxHeight
    ) continue;

    state.blockMap[b.y][b.z][b.x] = b.id;
  }

  // 高さ再計算
  for (let z = 0; z < state.heightLength; z++) {
    for (let x = 0; x < state.widthLength; x++) {

      for (let y = state.maxHeight - 1; y >= 0; y--) {
        if (state.blockMap[y][z][x] !== 0) {
          state.map[z][x] = y;
          state.topBlockMap[z][x] = state.blockMap[y][z][x];
          break;
        }
      }

    }
  }
}

const splitBloxdschem = function (json) {
	const schems = [];
	const zySize = Math.ceil(json.sizeY / 32) * Math.ceil(json.sizeZ / 32);
	const sliceSize = Math.floor(200 / zySize);
	let currOffset = 0;
	while (true) {
		const chunksSlice = json.chunks.splice(0, zySize * sliceSize);
		if (!chunksSlice.length) break;

		chunksSlice.map(chunk => chunk.x -= currOffset);

		schems.push({
			name: json.name,
			x: 0,
			y: 0,
			z: 0,
			sizeX: Math.min(json.sizeX, sliceSize * 32),
			sizeY: json.sizeY,
			sizeZ: json.sizeZ,
			chunks: chunksSlice
		})
		currOffset += sliceSize;
	}
	return {
		schems: schems,
		sliceSize: sliceSize
	};
}

function decodeBlocks(avroChunk) {
	let i = 0
	const blocks = []
	function decodeLEB128() {
		let shift = 0
		let value = 0

		while (true) {
			const byte = avroChunk.blocks[i++]
			value |= (byte & 127) << shift
			shift += 7
			if ((byte & 128) === 0) break
		}
		return value
	}
	while (i < avroChunk.blocks.length) {
		const amount = decodeLEB128()
		const id = decodeLEB128()
		for (let j = 0; j < amount; j++) {
			blocks.push(id)
		}
	}

	return blocks
}

async function downloadSchems(result) {
  const zip = new JSZip();

  result.schems.forEach((bin, i) => {
    const fileName = `${state.fileName || "schem"}${i}.bloxdschem`;
    zip.file(fileName, bin);
  });
  
  const content = await zip.generateAsync({ type: "blob" });

  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${state.fileName || "data"}.zip`;
  a.click();

  URL.revokeObjectURL(url);
}

export function downloadJSON() {
  const data = {
    version: 1,
    map: state.map,
    topBlockMap: state.topBlockMap,
    layerMap: state.layerMap,
    meta: {
      width: state.widthLength,
      height: state.heightLength,
      maxHeight: state.maxHeight,
      time: Date.now()
    }
  };

  const json = JSON.stringify(data);
  const blob = new Blob([json], { type: "application/json" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `terrain_${Date.now()}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

export function importJSON(file) {
  const reader = new FileReader();

  reader.onload = async () => {
    try {
      const data = JSON.parse(reader.result);

      if (!data.map || !data.meta) {
        throw new Error("Invalid format");
      }

      const targetChunkX = Math.ceil(data.meta.width / chunkSize);
      const targetChunkZ = Math.ceil(data.meta.height / chunkSize);

      if (
        targetChunkX !== state.chunkLenX ||
        targetChunkZ !== state.chunkLenZ
      ) {
        const ok = confirm("マップサイズが違います。リサイズして読み込みますか？");
        if (!ok) return;

        await resizeMap(targetChunkX, targetChunkZ);
      }

      if (data.meta.maxHeight !== state.maxHeight) {
        await resizeHeight(data.meta.maxHeight);
      }

      state.map = data.map;
      state.topBlockMap = data.topBlockMap ?? null;
      state.layerMap = data.layerMap ?? null;

      for (let y = 0; y < state.heightLength; y++) {
        for (let x = 0; x < state.widthLength; x++) {
          rebuildColumn(x, y, state.map[y][x]);
        }
      }

      state.dirtyChunks.clear();
      for (let cy = 0; cy < state.chunkRows; cy++) {
        for (let cx = 0; cx < state.chunkCols; cx++) {
          state.dirtyChunks.add(`${cx},${cy}`);
        }
      }

      console.log("Loaded JSON");

    } catch (e) {
      console.error("Invalid JSON", e);
    }
  };

  reader.readAsText(file);
}

function loadSchem(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const arrayBuffer = reader.result;
        const uint8 = new Uint8Array(arrayBuffer);

        const buf = Buffer.from(uint8);
        const result = parse(buf);

        resolve(result);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = reject;

    reader.readAsArrayBuffer(file);
  });
}
function parse(avroBuffer) {
	const data = schema0.fromBuffer(avroBuffer, undefined, true);
	return convertTo3D(data);
}

function writeBloxdSchem(json) {
	const avroJson = {
		name: json.name,
		x: 0,
		y: 0,
		z: 0,
		sizeX: 0,
		sizeY: 0,
		sizeZ: 0,
		chunks: [],
		filler: 0
	};
	function encodeLEB128(value) {
		const bytes = new Array();
		while ((value & -128) != 0) {
			let schemId = value & 127 | 128;
			bytes.push(schemId);
			value >>>= 7;
		}
		bytes.push(value);
		return bytes;
	}

	[
		avroJson.x,
		avroJson.y,
		avroJson.z
	] = json.pos;

	[
		avroJson.sizeX,
		avroJson.sizeY,
		avroJson.sizeZ,
	] = json.size;

	for (let chunkI = 0; chunkI < json.chunks.length; chunkI++) {
		const chunk = json.chunks[chunkI];
		const avroChunk = {};
		const RLEArray = [];

		let currId = chunk.blocks[0];
		let currAmt = 1;

		for (let i = 1; i <= chunk.blocks.length; i++) {
			const id = chunk.blocks[i];
			if (id === currId) {
				currAmt++;
			} else {
				RLEArray.push(...encodeLEB128(currAmt));
				RLEArray.push(...encodeLEB128(currId));
				currAmt = 1;
				currId = id;
			}
		}

		avroChunk.x = chunk.x;
		avroChunk.y = chunk.y;
		avroChunk.z = chunk.z;

		avroChunk.blocks = new Uint8Array(RLEArray);
		avroJson.chunks.push(avroChunk);
	}

	const {
		schems: splitJsons,
		sliceSize
	} = splitBloxdschem(avroJson);
	const bins = [];
	for (const json of splitJsons) {
		for (const chunk of json.chunks) {
			chunk.blocks = Buffer.from(chunk.blocks);
		}

		bins.push(schema0.toBuffer(json));
	}
	return {
		schems: bins,
		sliceSize: sliceSize * 32
	};
};

export { writeBloxdSchem, loadSchem, convertChunks, downloadSchems, applyParsed};