//Read and write .bloxdschem files, mainly using avsc
import avro from "https://esm.sh/avsc@5.7.9";
import { Buffer } from "https://esm.sh/buffer";

import {
	state,
	cellSize, widthLength, heightLength, maxHeight, contour, DEFAULT_COLOR,
	blockColors, layerColors, mapInit, blockMapInit, layerMapInit
} from "./state.js";

import { nameToId } from "./nameMap.js";

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

function convertToChunks(state) {
  const chunkSize = 32;
  const chunks = [];

  const maxXChunks = Math.ceil(widthLength / chunkSize);
  const maxYChunks = Math.ceil(maxHeight / chunkSize);
  const maxZChunks = Math.ceil(heightLength / chunkSize);

  for (let cx = 0; cx < maxXChunks; cx++) {
    for (let cy = 0; cy < maxYChunks; cy++) {
      for (let cz = 0; cz < maxZChunks; cz++) {
        const blocks = [];
				for (let x = 0; x < 32; x++) {
					for (let y = 0; y < 32; y++) {
						for (let z = 0; z < 32; z++) {
							
							const wx = cx * 32 + x;
							const wy = cy * 32 + y;
							const wz = cz * 32 + z;

							let id = 0; 

							if (wx < widthLength && wz < heightLength && wy < maxHeight) {
								const height = state.map[wz][wx];
								const surfaceBlock = state.blockMap[wz][wx];

								if (wy < height - 1) id = nameToId.Dirt;
								else if (wy < height) id = nameToId[surfaceBlock] ?? 1;
							}

							blocks.push(id);
						}
					}
				}

        chunks.push({
          x: cx,
          y: cy,
          z: cz,
          blocks: blocks
        });
      }
    }
  }

  return chunks;
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
			//maybe shorter for final?
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

function downloadSchems(result) {
  result.schems.forEach((bin, i) => {
    const blob = new Blob([bin], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `schem_${i}.bloxdschem`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

const write = function (json) {
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

export { write as writeBloxdSchem, convertToChunks, downloadSchems };