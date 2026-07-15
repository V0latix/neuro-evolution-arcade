export const SNAPSHOT_VERSION = "th3-2026-07-11-v2";
// Snapshot versions combat data; layout versions the three base geometries independently.
export const RAID_LAYOUT_VERSION = "th3-reference-layouts-v3";
export const SNAPSHOT_VERIFIED_AT = "2026-07-11";
export const ARMY_CAPACITY = 70;
export const GRID = Object.freeze({ width: 48, height: 32 });

export const SNAPSHOT_SOURCES = Object.freeze([
  "https://clashofclans.fandom.com/wiki/Town_Hall?page=1",
  "https://www.clash.ninja/guides/new-player-guide",
  "https://clash-wiki.com/buildings/town-hall/town-hall-level-3/",
]);

export const LAYOUT_SOURCES = deepFreeze({
  "farm-111": "https://clashofclans-layouts.com/fr/plans/th_3/farm_111.html",
  "war-26": "https://clashofclans-layouts.com/fr/plans/th_3/war_26.html",
  "defence-104": "https://clashofclans-layouts.com/fr/plans/th_3/defence_104.html",
});

export const TROOPS = deepFreeze({
  barbarian: {
    id: "barbarian",
    level: 2,
    dps: 12,
    hp: 54,
    housing: 1,
    targetPriority: "any",
  },
  archer: {
    id: "archer",
    level: 2,
    dps: 10,
    hp: 26,
    housing: 1,
    targetPriority: "any",
    range: 3.5,
  },
  giant: {
    id: "giant",
    level: 1,
    dps: 12,
    hp: 400,
    housing: 5,
    targetPriority: "defense",
  },
  goblin: {
    id: "goblin",
    level: 2,
    dps: 14,
    hp: 30,
    housing: 1,
    targetPriority: "resource",
    resourceDamageMultiplier: 2,
  },
  wallBreaker: {
    id: "wallBreaker",
    level: 1,
    dps: 0,
    hp: 20,
    housing: 2,
    targetPriority: "wall",
    wallDamage: 400,
  },
});

export const BUILDING_DEFINITIONS = deepFreeze({
  townHall: { count: 1, level: 3, category: "core", hp: 1600, width: 4, height: 4 },
  clanCastle: { count: 1, level: 1, category: "army", hp: 1000, width: 3, height: 3 },
  armyCamp: { count: 2, level: 3, category: "army", hp: 290, width: 4, height: 4 },
  barracks: { count: 1, level: 5, category: "army", hp: 420, width: 3, height: 3 },
  laboratory: { count: 1, level: 1, category: "army", hp: 500, width: 3, height: 3 },
  goldMine: { count: 3, level: 6, category: "resource", hp: 600, width: 3, height: 3 },
  elixirCollector: {
    count: 3,
    level: 6,
    category: "resource",
    hp: 600,
    width: 3,
    height: 3,
  },
  goldStorage: {
    count: 2,
    level: 6,
    category: "resource",
    hp: 1400,
    width: 3,
    height: 3,
  },
  elixirStorage: {
    count: 2,
    level: 6,
    category: "resource",
    hp: 1400,
    width: 3,
    height: 3,
  },
  builderHut: { count: 2, level: 1, category: "core", hp: 250, width: 2, height: 2 },
  cannon: {
    count: 2,
    level: 4,
    category: "defense",
    hp: 500,
    dps: 17,
    range: 9,
    attackInterval: 0.8,
    projectileSpeed: 18,
    width: 3,
    height: 3,
  },
  archerTower: {
    count: 1,
    level: 3,
    category: "defense",
    hp: 460,
    dps: 19,
    range: 10,
    attackInterval: 0.5,
    projectileSpeed: 22,
    width: 3,
    height: 3,
  },
  mortar: {
    count: 1,
    level: 1,
    category: "defense",
    hp: 400,
    dps: 4,
    damage: 20,
    range: 11,
    minimumRange: 4,
    attackInterval: 5,
    projectileSpeed: 10,
    splashRadius: 1.5,
    width: 3,
    height: 3,
  },
});

export const WALL_DEFINITION = deepFreeze({
  type: "wall",
  count: 50,
  level: 3,
  hp: 400,
});

export const TRAP_DEFINITIONS = deepFreeze({
  bomb: {
    count: 2,
    level: 2,
    damage: 24,
    triggerRadius: 1.5,
    splashRadius: 3,
  },
});

export const BUILDING_ROSTER = deepFreeze(
  Object.entries(BUILDING_DEFINITIONS).flatMap(([type, definition]) =>
    Array.from({ length: definition.count }, (_, index) => {
      const { count: _count, ...stats } = definition;
      return { id: `${type}-${index + 1}`, type, ...stats };
    }),
  ),
);

const FARM_111_BUILDING_POSITIONS = deepFreeze({
  "archerTower-1": point(28, 13),
  "armyCamp-1": point(15, 16),
  "armyCamp-2": point(32, 16),
  "barracks-1": point(27, 9),
  "builderHut-1": point(22, 25),
  "builderHut-2": point(29, 25),
  "cannon-1": point(28, 21),
  "cannon-2": point(21, 13),
  "clanCastle-1": point(25, 23),
  "elixirCollector-1": point(33, 13),
  "elixirCollector-2": point(16, 12),
  "elixirCollector-3": point(16, 22),
  "elixirStorage-1": point(21, 17),
  "elixirStorage-2": point(28, 17),
  "goldMine-1": point(32, 9),
  "goldMine-2": point(33, 22),
  "goldMine-3": point(19, 9),
  "goldStorage-1": point(25, 20),
  "goldStorage-2": point(25, 13),
  "laboratory-1": point(23, 9),
  "mortar-1": point(21, 21),
  "townHall-1": point(24, 16),
});
const FARM_111_WALLS = deepFreeze([
  point(20, 12), point(21, 12), point(22, 12), point(23, 12), point(24, 12), point(26, 12),
  point(28, 12), point(29, 12), point(30, 12), point(31, 12), point(20, 13), point(31, 13),
  point(20, 14), point(31, 14), point(20, 15), point(31, 15), point(20, 16), point(21, 16),
  point(22, 16), point(23, 16), point(28, 16), point(29, 16), point(30, 16), point(31, 16),
  point(20, 20), point(21, 20), point(22, 20), point(23, 20), point(24, 20), point(28, 20),
  point(29, 20), point(30, 20), point(31, 20), point(20, 21), point(31, 21), point(20, 22),
  point(31, 22), point(20, 23), point(31, 23), point(20, 24), point(21, 24), point(22, 24),
  point(23, 24), point(24, 24), point(28, 24), point(29, 24), point(30, 24), point(31, 24),
  point(25, 26), point(27, 26),
]);
const FARM_111_TRAPS = deepFreeze([point(20, 18), point(31, 18)]);

const WAR_26_BUILDING_POSITIONS = deepFreeze({
  "archerTower-1": point(28, 13),
  "armyCamp-1": point(32, 15),
  "armyCamp-2": point(24, 7),
  "barracks-1": point(17, 24),
  "builderHut-1": point(32, 12),
  "builderHut-2": point(30, 10),
  "cannon-1": point(28, 19),
  "cannon-2": point(22, 13),
  "clanCastle-1": point(24, 20),
  "elixirCollector-1": point(17, 16),
  "elixirCollector-2": point(20, 9),
  "elixirCollector-3": point(18, 12),
  "elixirStorage-1": point(28, 16),
  "elixirStorage-2": point(25, 13),
  "goldMine-1": point(32, 21),
  "goldMine-2": point(29, 23),
  "goldMine-3": point(25, 24),
  "goldStorage-1": point(21, 24),
  "goldStorage-2": point(17, 20),
  "laboratory-1": point(21, 17),
  "mortar-1": point(21, 20),
  "townHall-1": point(24, 16),
});
const WAR_26_WALLS = deepFreeze([
  point(29, 10), point(29, 11), point(21, 12), point(22, 12), point(23, 12), point(24, 12),
  point(25, 12), point(26, 12), point(27, 12), point(28, 12), point(29, 12), point(30, 12),
  point(31, 12), point(21, 13), point(31, 13), point(21, 14), point(31, 14), point(32, 14),
  point(33, 14), point(21, 15), point(31, 15), point(20, 16), point(21, 16), point(22, 16),
  point(31, 16), point(20, 17), point(31, 17), point(20, 18), point(31, 18), point(20, 19),
  point(31, 19), point(20, 20), point(31, 20), point(20, 21), point(27, 21), point(31, 21),
  point(20, 22), point(27, 22), point(28, 22), point(29, 22), point(30, 22), point(31, 22),
  point(20, 23), point(21, 23), point(22, 23), point(23, 23), point(24, 23), point(25, 23),
  point(26, 23), point(27, 23),
]);
const WAR_26_TRAPS = deepFreeze([point(23, 16), point(27, 20)]);

const DEFENCE_104_BUILDING_POSITIONS = deepFreeze({
  "archerTower-1": point(20, 19),
  "armyCamp-1": point(19, 6),
  "armyCamp-2": point(31, 18),
  "barracks-1": point(24, 19),
  "builderHut-1": point(16, 7),
  "builderHut-2": point(33, 24),
  "cannon-1": point(21, 12),
  "cannon-2": point(27, 18),
  "clanCastle-1": point(20, 15),
  "elixirCollector-1": point(26, 8),
  "elixirCollector-2": point(31, 8),
  "elixirCollector-3": point(31, 13),
  "elixirStorage-1": point(27, 15),
  "elixirStorage-2": point(24, 12),
  "goldMine-1": point(16, 16),
  "goldMine-2": point(16, 20),
  "goldMine-3": point(23, 23),
  "goldStorage-1": point(27, 22),
  "goldStorage-2": point(17, 12),
  "laboratory-1": point(19, 23),
  "mortar-1": point(27, 12),
  "townHall-1": point(23, 15),
});
const DEFENCE_104_WALLS = deepFreeze([
  point(16, 11), point(17, 11), point(18, 11), point(19, 11), point(20, 11), point(21, 11),
  point(22, 11), point(23, 11), point(24, 11), point(25, 11), point(26, 11), point(27, 11),
  point(28, 11), point(29, 11), point(30, 11), point(16, 12), point(30, 12), point(16, 13),
  point(30, 13), point(16, 14), point(30, 14), point(19, 15), point(30, 15), point(19, 16),
  point(30, 16), point(19, 17), point(30, 17), point(19, 18), point(30, 18), point(19, 19),
  point(30, 19), point(19, 20), point(30, 20), point(19, 21), point(30, 21), point(19, 22),
  point(20, 22), point(21, 22), point(22, 22), point(23, 22), point(24, 22), point(25, 22),
  point(26, 22), point(30, 22), point(30, 23), point(30, 24), point(27, 25), point(28, 25),
  point(29, 25), point(30, 25),
]);
const DEFENCE_104_TRAPS = deepFreeze([point(17, 15), point(26, 24)]);

export const LAYOUTS = deepFreeze([
  makeLayout("farm-111", FARM_111_BUILDING_POSITIONS, FARM_111_WALLS, FARM_111_TRAPS),
  makeLayout("war-26", WAR_26_BUILDING_POSITIONS, WAR_26_WALLS, WAR_26_TRAPS),
  makeLayout(
    "defence-104",
    DEFENCE_104_BUILDING_POSITIONS,
    DEFENCE_104_WALLS,
    DEFENCE_104_TRAPS,
  ),
]);

export function composeArmy(scores) {
  if (!Array.isArray(scores) || scores.length !== 5) {
    throw new TypeError("Army composition requires exactly five scores");
  }

  const troopIds = Object.keys(TROOPS);
  const finiteScores = Array.from(scores, (score) => (Number.isFinite(score) ? score : 0));
  const maximum = Math.max(...finiteScores);
  const weights = finiteScores.map((score) => Math.exp(score - maximum));
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const composition = Object.fromEntries(troopIds.map((id) => [id, 0]));

  for (let index = 0; index < troopIds.length; index += 1) {
    const troop = TROOPS[troopIds[index]];
    const targetHousing = (weights[index] / weightTotal) * ARMY_CAPACITY;
    composition[troop.id] = Math.floor(targetHousing / troop.housing);
  }

  let remaining = ARMY_CAPACITY - usedHousing(composition);
  const priority = troopIds
    .map((id, index) => ({ id, index, score: finiteScores[index] }))
    .sort((left, right) => right.score - left.score || left.index - right.index);
  while (remaining > 0) {
    const candidate = priority.find(({ id }) => TROOPS[id].housing <= remaining);
    composition[candidate.id] += 1;
    remaining -= TROOPS[candidate.id].housing;
  }
  return composition;
}

export function usedHousing(composition) {
  return Object.entries(TROOPS).reduce(
    (total, [id, troop]) => total + (composition[id] ?? 0) * troop.housing,
    0,
  );
}

export function mapPerimeterPosition(normalizedPosition) {
  if (
    !Number.isFinite(normalizedPosition) ||
    normalizedPosition < 0 ||
    normalizedPosition > 1
  ) {
    throw new RangeError("Deployment position must be between 0 and 1");
  }
  const horizontal = GRID.width - 1;
  const vertical = GRID.height - 1;
  const perimeter = 2 * (horizontal + vertical);
  let distance = (normalizedPosition % 1) * perimeter;

  if (distance <= horizontal) return { x: distance, y: 0, side: "top" };
  distance -= horizontal;
  if (distance <= vertical) return { x: horizontal, y: distance, side: "right" };
  distance -= vertical;
  if (distance <= horizontal) {
    return { x: horizontal - distance, y: vertical, side: "bottom" };
  }
  distance -= horizontal;
  return { x: 0, y: vertical - distance, side: "left" };
}

export function validateLayout(layout) {
  const errors = [];
  const expectedBuildingIds = BUILDING_ROSTER.map(({ id }) => id).sort();
  const actualBuildingIds = (layout?.buildings ?? []).map(({ id }) => id).sort();
  if (JSON.stringify(expectedBuildingIds) !== JSON.stringify(actualBuildingIds)) {
    errors.push("Layout must contain the exact building roster");
  }
  if ((layout?.walls ?? []).length !== WALL_DEFINITION.count) {
    errors.push(`Layout must contain ${WALL_DEFINITION.count} walls`);
  }
  if ((layout?.traps ?? []).length !== TRAP_DEFINITIONS.bomb.count) {
    errors.push(`Layout must contain ${TRAP_DEFINITIONS.bomb.count} bombs`);
  }

  const expectedById = new Map(BUILDING_ROSTER.map((building) => [building.id, building]));
  for (const building of layout?.buildings ?? []) {
    const expected = expectedById.get(building.id);
    if (!expected) continue;
    for (const [key, value] of Object.entries(expected)) {
      if (building[key] !== value) {
        errors.push(`Building ${building.id} has invalid metadata: ${key}`);
      }
    }
  }
  for (const wall of layout?.walls ?? []) {
    if (wall.type !== WALL_DEFINITION.type || wall.level !== WALL_DEFINITION.level) {
      errors.push(`Wall ${wall.id} has invalid metadata`);
    }
  }
  for (const trap of layout?.traps ?? []) {
    if (trap.type !== "bomb" || trap.level !== TRAP_DEFINITIONS.bomb.level) {
      errors.push(`Trap ${trap.id} has invalid metadata`);
    }
  }

  const entities = [
    ...(layout?.buildings ?? []),
    ...(layout?.walls ?? []),
    ...(layout?.traps ?? []),
  ];
  const ids = new Set();
  const cells = new Set();
  for (const entity of entities) {
    if (ids.has(entity.id)) errors.push(`Duplicate entity id: ${entity.id}`);
    ids.add(entity.id);
    const width = entity.type && BUILDING_DEFINITIONS[entity.type] ? entity.width : 1;
    const height = entity.type && BUILDING_DEFINITIONS[entity.type] ? entity.height : 1;
    if (
      !Number.isInteger(entity.x) ||
      !Number.isInteger(entity.y) ||
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      entity.x < 0 ||
      entity.x + width > GRID.width ||
      entity.y < 0 ||
      entity.y + height > GRID.height
    ) {
      errors.push(`Entity ${entity.id} is outside the grid`);
    }
    for (let offsetY = 0; offsetY < height; offsetY += 1) {
      for (let offsetX = 0; offsetX < width; offsetX += 1) {
        const cell = `${entity.x + offsetX},${entity.y + offsetY}`;
        if (cells.has(cell)) errors.push(`Entity ${entity.id} overlaps another entity`);
        cells.add(cell);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function makeLayout(id, buildingPositions, wallPositions, trapPositions) {
  return {
    id,
    grid: GRID,
    buildings: BUILDING_ROSTER.map((building, index) => ({
      ...building,
      ...(Array.isArray(buildingPositions)
        ? buildingPositions[index]
        : buildingPositions[building.id]),
    })),
    walls: wallPositions.map((position, index) => ({
      id: `wall-${index + 1}`,
      type: "wall",
      level: WALL_DEFINITION.level,
      ...position,
    })),
    traps: trapPositions.map((position, index) => ({
      id: `bomb-${index + 1}`,
      type: "bomb",
      level: TRAP_DEFINITIONS.bomb.level,
      ...position,
    })),
  };
}

function point(x, y) {
  return { x, y };
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
