import test from "node:test";
import assert from "node:assert/strict";

import { EXPECTED_REFERENCE_LAYOUTS } from "./fixtures/village-raid-reference-layouts.mjs";

import {
  LAYOUT_SOURCES,
  ARMY_CAPACITY,
  BUILDING_DEFINITIONS,
  BUILDING_ROSTER,
  GRID,
  LAYOUTS,
  RAID_LAYOUT_VERSION,
  SNAPSHOT_VERSION,
  TRAP_DEFINITIONS,
  TROOPS,
  WALL_DEFINITION,
  composeArmy,
  mapPerimeterPosition,
  usedHousing,
  validateLayout,
} from "../src/village-raid-data.js";

const REFERENCE_BUILDING_COUNTS = {
  townHall: 1,
  clanCastle: 1,
  armyCamp: 2,
  barracks: 1,
  laboratory: 1,
  goldMine: 3,
  elixirCollector: 3,
  goldStorage: 2,
  elixirStorage: 2,
  builderHut: 2,
  cannon: 2,
  archerTower: 1,
  mortar: 1,
};

test("the dated TH3 snapshot exposes the complete maxed roster", () => {
  assert.equal(ARMY_CAPACITY, 70);
  assert.deepEqual(
    Object.fromEntries(Object.entries(TROOPS).map(([id, troop]) => [id, troop.level])),
    { barbarian: 2, archer: 2, giant: 1, goblin: 2, wallBreaker: 1 },
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(TROOPS).map(([id, troop]) => [id, [troop.dps, troop.hp, troop.housing]]),
    ),
    {
      barbarian: [12, 54, 1],
      archer: [10, 26, 1],
      giant: [12, 400, 5],
      goblin: [14, 30, 1],
      wallBreaker: [0, 20, 2],
    },
  );
  assert.equal(TROOPS.giant.targetPriority, "defense");
  assert.equal(TROOPS.goblin.resourceDamageMultiplier, 2);
  assert.equal(TROOPS.wallBreaker.wallDamage, 400);

  const expectedBuildings = {
    townHall: [1, 3],
    clanCastle: [1, 1],
    armyCamp: [2, 3],
    barracks: [1, 5],
    laboratory: [1, 1],
    goldMine: [3, 6],
    elixirCollector: [3, 6],
    goldStorage: [2, 6],
    elixirStorage: [2, 6],
    builderHut: [2, 1],
    cannon: [2, 4],
    archerTower: [1, 3],
    mortar: [1, 1],
  };
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(BUILDING_DEFINITIONS).map(([id, definition]) => [
        id,
        [definition.count, definition.level],
      ]),
    ),
    expectedBuildings,
  );
  assert.equal(BUILDING_ROSTER.length, 22);
  assert.equal(new Set(BUILDING_ROSTER.map((building) => building.id)).size, 22);
  for (const building of BUILDING_ROSTER) {
    assert.ok(building.hp > 0, `${building.id} needs hit points`);
    assert.match(building.category, /^(core|army|resource|defense)$/);
  }
  for (const id of ["cannon", "archerTower", "mortar"]) {
    const defense = BUILDING_DEFINITIONS[id];
    assert.ok(defense.dps > 0);
    assert.ok(defense.range > 0);
    assert.ok(defense.attackInterval > 0);
  }
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(BUILDING_DEFINITIONS).map(([id, definition]) => [id, definition.hp]),
    ),
    {
      townHall: 1600,
      clanCastle: 1000,
      armyCamp: 290,
      barracks: 420,
      laboratory: 500,
      goldMine: 600,
      elixirCollector: 600,
      goldStorage: 1400,
      elixirStorage: 1400,
      builderHut: 250,
      cannon: 500,
      archerTower: 460,
      mortar: 400,
    },
  );
  assert.deepEqual(
    pick(BUILDING_DEFINITIONS.cannon, ["dps", "attackInterval"]),
    { dps: 17, attackInterval: 0.8 },
  );
  assert.deepEqual(
    pick(BUILDING_DEFINITIONS.archerTower, ["dps", "attackInterval"]),
    { dps: 19, attackInterval: 0.5 },
  );
  assert.deepEqual(
    pick(BUILDING_DEFINITIONS.mortar, [
      "dps",
      "damage",
      "attackInterval",
      "range",
      "minimumRange",
    ]),
    { dps: 4, damage: 20, attackInterval: 5, range: 11, minimumRange: 4 },
  );
  assert.equal(BUILDING_DEFINITIONS.mortar.splashRadius, 1.5);
  assert.deepEqual(
    [WALL_DEFINITION.count, WALL_DEFINITION.level, WALL_DEFINITION.hp],
    [50, 3, 400],
  );
  assert.deepEqual(
    [TRAP_DEFINITIONS.bomb.count, TRAP_DEFINITIONS.bomb.level],
    [2, 2],
  );
  assert.ok(TRAP_DEFINITIONS.bomb.damage > 0);
  assert.deepEqual(
    pick(TRAP_DEFINITIONS.bomb, ["damage", "triggerRadius", "splashRadius"]),
    { damage: 24, triggerRadius: 1.5, splashRadius: 3 },
  );
});

test("the dated TH3 snapshot matches the 22 buildings visible in every reference", () => {
  assert.equal(SNAPSHOT_VERSION, "th3-2026-07-11-v2");
  assert.equal(BUILDING_ROSTER.length, 22);
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(BUILDING_DEFINITIONS).map(([type, definition]) => [type, definition.count]),
    ),
    REFERENCE_BUILDING_COUNTS,
  );
  assert.equal(BUILDING_DEFINITIONS.builderHut.count, 2);
});

test("army camps use their TH3 4 by 4 footprint", () => {
  assert.deepEqual(
    { width: BUILDING_DEFINITIONS.armyCamp.width, height: BUILDING_DEFINITIONS.armyCamp.height },
    { width: 4, height: 4 },
  );
  assert.ok(
    BUILDING_ROSTER.filter(({ type }) => type === "armyCamp")
      .every(({ width, height }) => width === 4 && height === 4),
  );
});

test("army composition always spends exactly 70 housing deterministically", () => {
  const scoreSets = [
    [0, 0, 0, 0, 0],
    [1, 2, 3, 4, 5],
    [100, -100, -100, -100, -100],
    [-5, -4, -3, -2, -1],
    [Number.NaN, Number.POSITIVE_INFINITY, 0.25, 0.25, 0.25],
    Array(5),
  ];
  for (const scores of scoreSets) {
    const composition = composeArmy(scores);
    assert.equal(usedHousing(composition), ARMY_CAPACITY, String(scores));
    assert.deepEqual(composeArmy(scores), composition, "composition must be deterministic");
    assert.deepEqual(Object.keys(composition), Object.keys(TROOPS));
    for (const count of Object.values(composition)) {
      assert.ok(Number.isInteger(count) && count >= 0);
    }
  }
  assert.throws(() => composeArmy([1, 2]), /five scores/i);
});

test("normalized deployment positions cover only the common grid perimeter", () => {
  const samples = [0, 0.01, 0.25, 0.5, 0.75, 0.99, 1];
  const points = samples.map(mapPerimeterPosition);
  for (const point of points) {
    assert.ok(point.x >= 0 && point.x <= GRID.width - 1);
    assert.ok(point.y >= 0 && point.y <= GRID.height - 1);
    assert.ok(
      point.x === 0 ||
        point.x === GRID.width - 1 ||
        point.y === 0 ||
        point.y === GRID.height - 1,
      `(${point.x}, ${point.y}) is not on the perimeter`,
    );
  }
  assert.deepEqual(mapPerimeterPosition(0), mapPerimeterPosition(1));
  assert.throws(() => mapPerimeterPosition(-0.01), /between 0 and 1/i);
  assert.throws(() => mapPerimeterPosition(1.01), /between 0 and 1/i);
});

test("the three reference layouts preserve their source identity and exact inventory", () => {
  assert.equal(RAID_LAYOUT_VERSION, "th3-reference-layouts-v3");
  assert.deepEqual(LAYOUTS.map(({ id }) => id), ["farm-111", "war-26", "defence-104"]);
  assert.deepEqual(LAYOUT_SOURCES, {
    "farm-111": "https://clashofclans-layouts.com/fr/plans/th_3/farm_111.html",
    "war-26": "https://clashofclans-layouts.com/fr/plans/th_3/war_26.html",
    "defence-104": "https://clashofclans-layouts.com/fr/plans/th_3/defence_104.html",
  });

  for (const layout of LAYOUTS) {
    assert.equal(layout.buildings.length, 22, layout.id);
    assert.equal(layout.walls.length, 50);
    assert.equal(layout.traps.length, 2);
    assert.equal(validateLayout(layout).valid, true, layout.id);
    assert.deepEqual(
      Object.fromEntries(
        Object.keys(REFERENCE_BUILDING_COUNTS).map((type) => [
          type,
          layout.buildings.filter((building) => building.type === type).length,
        ]),
      ),
      REFERENCE_BUILDING_COUNTS,
      layout.id,
    );
  }
});

test("the independent screenshot fixture records every gameplay entity", () => {
  assert.equal(
    Object.values(EXPECTED_REFERENCE_LAYOUTS).reduce(
      (total, layout) => total + Object.keys(layout.buildings).length,
      0,
    ),
    66,
  );
  assert.equal(
    Object.values(EXPECTED_REFERENCE_LAYOUTS).reduce(
      (total, layout) => total + layout.walls.length,
      0,
    ),
    150,
  );
  assert.equal(
    Object.values(EXPECTED_REFERENCE_LAYOUTS).reduce(
      (total, layout) => total + layout.traps.length,
      0,
    ),
    6,
  );
});

test("reference layouts exactly match the calibrated screenshot fixtures", () => {
  assert.equal(RAID_LAYOUT_VERSION, "th3-reference-layouts-v3");
  for (const layout of LAYOUTS) {
    assert.deepEqual(layoutSignature(layout), EXPECTED_REFERENCE_LAYOUTS[layout.id], layout.id);
  }
});

test("farm-111 uses the submitted calibrated wall compartments and traps", () => {
  const layout = LAYOUTS.find(({ id }) => id === "farm-111");
  const expected = EXPECTED_REFERENCE_LAYOUTS[layout.id];
  assertWallCells(layout, [
    [20, 12], [31, 16], [20, 20], [31, 24], [25, 26], [27, 26],
  ], "submitted wall compartments");
  assert.deepEqual(layoutSignature(layout).traps, expected.traps);
});

test("war-26 uses the submitted calibrated wall compartments and traps", () => {
  const layout = LAYOUTS.find(({ id }) => id === "war-26");
  const expected = EXPECTED_REFERENCE_LAYOUTS[layout.id];
  assertWallCells(layout, [
    [29, 10], [21, 12], [33, 14], [20, 16], [27, 21], [27, 23],
  ], "submitted wall compartments");
  assert.deepEqual(layoutSignature(layout).traps, expected.traps);
});

test("defence-104 uses the submitted calibrated wall compartments and traps", () => {
  const layout = LAYOUTS.find(({ id }) => id === "defence-104");
  const expected = EXPECTED_REFERENCE_LAYOUTS[layout.id];
  assertWallCells(layout, [
    [16, 11], [30, 14], [19, 15], [19, 22], [30, 24], [27, 25],
  ], "submitted wall compartments");
  assert.deepEqual(layoutSignature(layout).traps, expected.traps);
});

test("building footprints and combat metadata are propagated into autonomous layouts", () => {
  for (const [type, definition] of Object.entries(BUILDING_DEFINITIONS)) {
    assert.ok(Number.isInteger(definition.width) && definition.width > 0, `${type} width`);
    assert.ok(Number.isInteger(definition.height) && definition.height > 0, `${type} height`);
  }

  for (const building of BUILDING_ROSTER) {
    const definition = BUILDING_DEFINITIONS[building.type];
    for (const key of ["hp", "category", "width", "height"]) {
      assert.equal(building[key], definition[key], `${building.id} must propagate ${key}`);
    }
    if (building.category === "defense") {
      for (const key of ["dps", "range", "attackInterval", "projectileSpeed"]) {
        assert.equal(building[key], definition[key], `${building.id} must propagate ${key}`);
      }
    }
  }

  for (const layout of LAYOUTS) {
    for (const building of layout.buildings) {
      const rosterEntry = BUILDING_ROSTER.find(({ id }) => id === building.id);
      for (const [key, value] of Object.entries(rosterEntry)) {
        assert.equal(building[key], value, `${layout.id}/${building.id}/${key}`);
      }
    }
  }
});

test("layout validation rejects corrupted entity metadata", () => {
  const corruptions = [
    ["building type", (layout) => (layout.buildings[0].type = "cannon")],
    ["building level", (layout) => (layout.buildings[0].level += 1)],
    ["wall type", (layout) => (layout.walls[0].type = "bomb")],
    ["wall level", (layout) => (layout.walls[0].level += 1)],
    ["trap type", (layout) => (layout.traps[0].type = "wall")],
    ["trap level", (layout) => (layout.traps[0].level += 1)],
  ];
  for (const [label, corrupt] of corruptions) {
    const layout = structuredClone(LAYOUTS[0]);
    corrupt(layout);
    const result = validateLayout(layout);
    assert.equal(result.valid, false, label);
    assert.ok(result.errors.some((error) => /metadata/i.test(error)), label);
  }
});

test("layout validation detects overlaps across complete building footprints", () => {
  const layout = structuredClone(LAYOUTS[0]);
  const [largeBuilding, movedBuilding] = layout.buildings;
  movedBuilding.x = largeBuilding.x + largeBuilding.width - 1;
  movedBuilding.y = largeBuilding.y + largeBuilding.height - 1;
  const result = validateLayout(layout);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => /overlap/i.test(error)));
});

test("layout validation reports missing, duplicate, overlapping and off-grid entities", () => {
  const source = LAYOUTS[0];
  const invalid = structuredClone(source);
  invalid.buildings.pop();
  invalid.walls[1].id = invalid.walls[0].id;
  invalid.traps[0].x = invalid.walls[0].x;
  invalid.traps[0].y = invalid.walls[0].y;
  invalid.traps[1].x = GRID.width;
  const result = validateLayout(invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => /building roster/i.test(error)));
  assert.ok(result.errors.some((error) => /duplicate/i.test(error)));
  assert.ok(result.errors.some((error) => /overlap/i.test(error)));
  assert.ok(result.errors.some((error) => /grid/i.test(error)));
});

function pick(value, keys) {
  return Object.fromEntries(keys.map((key) => [key, value[key]]));
}

function layoutSignature(layout) {
  return {
    buildings: Object.fromEntries(
      layout.buildings
        .map(({ id, x, y }) => [id, [x, y]])
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
    walls: layout.walls.map(({ x, y }) => [x, y]).sort(comparePoints),
    traps: layout.traps.map(({ x, y }) => [x, y]).sort(comparePoints),
  };
}

function comparePoints([leftX, leftY], [rightX, rightY]) {
  return leftY - rightY || leftX - rightX;
}

function assertWallCells(layout, points, label) {
  const walls = wallCellSet(layout);
  assert.ok(points.every(([x, y]) => walls.has(`${x},${y}`)), `${layout.id} ${label}`);
}

function wallCellSet(layout) {
  return new Set(layout.walls.map(({ x, y }) => `${x},${y}`));
}
