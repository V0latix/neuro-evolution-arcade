export const SNAPSHOT_VERSION = "th3-2026-07-11-v1";
// Snapshot versions combat data; layout versions the three base geometries independently.
export const RAID_LAYOUT_VERSION = "th3-layouts-v1";
export const SNAPSHOT_VERIFIED_AT = "2026-07-11";
export const ARMY_CAPACITY = 70;
export const GRID = Object.freeze({ width: 48, height: 32 });

export const SNAPSHOT_SOURCES = Object.freeze([
  "https://clashofclans.fandom.com/wiki/Town_Hall?page=1",
  "https://www.clash.ninja/guides/new-player-guide",
  "https://clash-wiki.com/buildings/town-hall/town-hall-level-3/",
]);

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
  armyCamp: { count: 2, level: 3, category: "army", hp: 290, width: 5, height: 5 },
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
  builderHut: { count: 5, level: 1, category: "core", hp: 250, width: 2, height: 2 },
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

const OPEN_BUILDING_POSITIONS = gridPositions(
  [10, 16, 22, 28, 34, 40],
  [6, 12, 18, 24, 28],
).slice(0, 25);
const COMPARTMENT_BUILDING_POSITIONS = gridPositions(
  [7, 14, 21, 28, 35],
  [6, 11, 16, 21, 26],
);
const CENTRAL_BUILDING_POSITIONS = deepFreeze({
  "townHall-1": point(22, 14),
  "clanCastle-1": point(17, 3),
  "armyCamp-1": point(24, 3),
  "armyCamp-2": point(31, 3),
  "barracks-1": point(38, 3),
  "laboratory-1": point(10, 9),
  "goldMine-1": point(17, 9),
  "goldMine-2": point(24, 9),
  "goldMine-3": point(31, 9),
  "elixirCollector-1": point(38, 9),
  "elixirCollector-2": point(10, 15),
  "elixirCollector-3": point(17, 15),
  "goldStorage-1": point(10, 3),
  "goldStorage-2": point(31, 15),
  "elixirStorage-1": point(38, 15),
  "elixirStorage-2": point(10, 21),
  "builderHut-1": point(17, 21),
  "builderHut-2": point(24, 21),
  "builderHut-3": point(31, 21),
  "builderHut-4": point(38, 21),
  "builderHut-5": point(10, 27),
  "cannon-1": point(17, 27),
  "cannon-2": point(24, 27),
  "archerTower-1": point(31, 27),
  "mortar-1": point(38, 27),
});

export const LAYOUTS = deepFreeze([
  makeLayout(
    "open",
    OPEN_BUILDING_POSITIONS,
    [
      ...line(4, 4, 43, 4),
      ...line(4, 5, 4, 14),
    ],
    [point(6, 6), point(45, 29)],
  ),
  makeLayout(
    "compartment",
    COMPARTMENT_BUILDING_POSITIONS,
    [
      ...line(12, 3, 12, 27),
      ...line(33, 3, 33, 27),
    ],
    [point(5, 4), point(42, 28)],
  ),
  makeLayout(
    "central",
    CENTRAL_BUILDING_POSITIONS,
    [
      ...line(7, 3, 7, 27),
      ...line(44, 3, 44, 27),
    ],
    [point(8, 29), point(43, 29)],
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

function gridPositions(xs, ys) {
  return ys.flatMap((y) => xs.map((x) => point(x, y)));
}

function line(startX, startY, endX, endY) {
  const length = Math.max(Math.abs(endX - startX), Math.abs(endY - startY));
  return Array.from({ length: length + 1 }, (_, index) =>
    point(
      startX + Math.sign(endX - startX) * index,
      startY + Math.sign(endY - startY) * index,
    ),
  );
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
