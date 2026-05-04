const ids = new Set();
const clicked = {};
const pos1 = {};

function getColor(ix, iz) {
  if (ix === 0 && iz === 0) return "white";
  if (ix === 0 || iz === 0) return "white";

  if (ix > 0 && iz > 0) return "red";
  if (ix < 0 && iz > 0) return "green";
  if (ix < 0 && iz < 0) return "blue";
  if (ix > 0 && iz < 0) return "yellow";
}

function setGridArrows(playerId, pos, range = 5, step = 32) {
  ids.forEach(id => api.clearDirectionArrow(playerId, id));

  for (let ix = -range; ix <= range; ix++) {
    for (let iz = -range; iz <= range; iz++) {
      const x = pos[0] + ix * step;
      const z = pos[2] + iz * step;

      const id = `grid_${playerId}_${ix}_${iz}`;
      ids.add(id);

      api.setDirectionArrow(
        playerId,
        id,
        [x + 0.5, pos[1], z + 0.5],
        `${ix},${iz}`,
        true,
        {
          color: getColor(ix, iz)
        }
      );
    }
  }
}

onPlayerClick = (playerId, wasAltClick, x, y, z) => {
  const held = api.getHeldItem(playerId);
  if (!held) return;

  if (held.name === "WorldBuilder Wand") {
    if (!clicked[playerId]) {
      pos1[playerId] = [x, y, z];
      clicked[playerId] = true;

      setGridArrows(playerId, [x, y, z]);
    } else {
      const p1 = pos1[playerId];
      const p2 = [x, y, z];

      const step = 32;

      const cx1 = Math.floor(p1[0] / step);
      const cz1 = Math.floor(p1[2] / step);
      const cx2 = Math.floor(p2[0] / step);
      const cz2 = Math.floor(p2[2] / step);

      const chunkX = Math.abs(cx1 - cx2) + 1;
      const chunkZ = Math.abs(cz1 - cz2) + 1;

      const total = chunkX * chunkZ;

      if(total > 200) api.sendMessage(playerId, `The number of chunks must be less than 200 (chunks: ${total})`);
      else if(chunkX !== chunkZ) api.sendMessage(playerId, "It must be a square");
      else api.sendMessage(playerId, `The number of chunks: ${total} (${chunkX} x ${chunkZ})`);

      ids.forEach(id => api.clearDirectionArrow(playerId, id));
      const cross = [p2[0], p1[1], p1[2]];

      const crossId = `cross_${playerId}`;

      api.clearDirectionArrow(playerId, crossId);

      api.setDirectionArrow(
        playerId,
        crossId,
        [cross[0] + 0.5, cross[1], cross[2] + 0.5],
        `Please paste here! ${cross.join(",")}`,
        true,
        { color: "cyan" }
      );

      clicked[playerId] = false;
      delete pos1[playerId];
    }
  }
};