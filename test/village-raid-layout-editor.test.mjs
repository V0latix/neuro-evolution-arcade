import test from "node:test";
import assert from "node:assert/strict";
import {
  LAYOUT_EDITOR_SCHEMA,
  applyLayoutEditorWallStroke,
  commitLayoutEditorHistory,
  createEmptyLayoutEditorState,
  createLayoutEditorHistory,
  isLayoutEditorEntityPlaced,
  layoutEditorDraftKey,
  layoutEditorReserveCounts,
  layoutEditorWallReserve,
  parseLayoutEditorDraft,
  placeLayoutEditorEntity,
  redoLayoutEditorHistory,
  removeLayoutEditorEntity,
  resetLayoutEditorHistory,
  serializeLayoutEditorDraft,
  serializeLayoutEditorExport,
  undoLayoutEditorHistory,
  validateLayoutEditorState,
} from "../src/village-raid-layout-editor.js";
import { LAYOUTS } from "../src/village-raid-data.js";

const farm = LAYOUTS.find(({ id }) => id === "farm-111");

function createCompletedState() {
  const initial = createEmptyLayoutEditorState(farm);
  const sourceBuildings = new Map(farm.buildings.map((entity) => [entity.id, entity]));
  const sourceTraps = new Map(farm.traps.map((entity) => [entity.id, entity]));
  return {
    ...initial,
    buildings: initial.buildings.map((entity) => ({
      ...entity,
      x: sourceBuildings.get(entity.id).x,
      y: sourceBuildings.get(entity.id).y,
    })),
    walls: farm.walls.map((wall) => ({ ...wall })),
    traps: initial.traps.map((entity) => ({
      ...entity,
      x: sourceTraps.get(entity.id).x,
      y: sourceTraps.get(entity.id).y,
    })),
  };
}

test("empty editor state preserves the locked roster entirely in reserve", () => {
  const state = createEmptyLayoutEditorState(farm);
  assert.equal(LAYOUT_EDITOR_SCHEMA, "village-raid-layout-editor-v2");
  assert.equal(state.schema, LAYOUT_EDITOR_SCHEMA);
  assert.equal(state.buildings.length, 22);
  assert.equal(state.traps.length, 2);
  assert.equal(state.walls.length, 0);
  assert.ok([...state.buildings, ...state.traps].every((entity) =>
    entity.x === null && entity.y === null
  ));
  assert.ok([...state.buildings, ...state.traps].every((entity) =>
    !isLayoutEditorEntityPlaced(entity)
  ));
  assert.deepEqual(layoutEditorReserveCounts(state), {
    buildings: 22,
    walls: 50,
    traps: 2,
  });
  assert.equal(layoutEditorWallReserve(state), 50);
});

test("placing and removing a reserved building keeps canonical metadata", () => {
  const initial = createEmptyLayoutEditorState(farm);
  const canonical = initial.buildings.find(({ id }) => id === "cannon-1");
  const placed = placeLayoutEditorEntity(
    initial,
    { kind: "building", id: canonical.id },
    { x: 6, y: 7 },
  );
  assert.equal(placed.error, null);
  assert.deepEqual(
    placed.state.buildings.find(({ id }) => id === canonical.id),
    { ...canonical, x: 6, y: 7 },
  );
  assert.deepEqual(layoutEditorReserveCounts(placed.state), {
    buildings: 21,
    walls: 50,
    traps: 2,
  });

  const removed = removeLayoutEditorEntity(
    placed.state,
    { kind: "building", id: canonical.id },
  );
  assert.equal(removed.error, null);
  assert.deepEqual(
    removed.state.buildings.find(({ id }) => id === canonical.id),
    canonical,
  );
});

test("reserve placement rejects footprint overlap and off-grid cells atomically", () => {
  let state = createEmptyLayoutEditorState(farm);
  state = placeLayoutEditorEntity(
    state,
    { kind: "building", id: "cannon-1" },
    { x: 2, y: 2 },
  ).state;
  const overlap = placeLayoutEditorEntity(
    state,
    { kind: "trap", id: "bomb-1" },
    { x: 3, y: 3 },
  );
  assert.equal(overlap.state, state);
  assert.match(overlap.error, /chevauche/i);
  const offGrid = placeLayoutEditorEntity(
    state,
    { kind: "building", id: "townHall-1" },
    { x: 47, y: 31 },
  );
  assert.equal(offGrid.state, state);
  assert.match(offGrid.error, /hors/i);
});

test("placing on the current cell and removing an entity already in reserve are no-ops", () => {
  const initial = createEmptyLayoutEditorState(farm);
  const placed = placeLayoutEditorEntity(
    initial,
    { kind: "trap", id: "bomb-1" },
    { x: 8, y: 9 },
  ).state;
  const unchanged = placeLayoutEditorEntity(
    placed,
    { kind: "trap", id: "bomb-1" },
    { x: 8, y: 9 },
  );
  assert.equal(unchanged.error, null);
  assert.equal(unchanged.state, placed);

  const reserved = removeLayoutEditorEntity(
    initial,
    { kind: "trap", id: "bomb-1" },
  );
  assert.equal(reserved.error, null);
  assert.equal(reserved.state, initial);
});

test("unknown entity selections fail atomically", () => {
  const state = createEmptyLayoutEditorState(farm);
  for (const operation of [placeLayoutEditorEntity, removeLayoutEditorEntity]) {
    const result = operation(
      state,
      { kind: "decoration", id: "bomb-1" },
      { x: 1, y: 1 },
    );
    assert.equal(result.state, state);
    assert.match(result.error, /inconnu/i);
  }
  const missing = placeLayoutEditorEntity(
    state,
    { kind: "building", id: "missing" },
    { x: 1, y: 1 },
  );
  assert.equal(missing.state, state);
  assert.match(missing.error, /inconnu/i);
});

test("wall paint and erase consume and restore the fixed reserve", () => {
  const initial = createEmptyLayoutEditorState(farm);
  const painted = applyLayoutEditorWallStroke(
    initial,
    "paint",
    [{ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
  );
  assert.equal(painted.error, null);
  assert.equal(painted.state.walls.length, 2);
  assert.equal(layoutEditorWallReserve(painted.state), 48);
  const erased = applyLayoutEditorWallStroke(
    painted.state,
    "erase",
    [{ x: 1, y: 1 }],
  );
  assert.equal(erased.state.walls.length, 1);
  assert.equal(layoutEditorWallReserve(erased.state), 49);
});

test("walls reject occupied or off-grid cells atomically", () => {
  const initial = createEmptyLayoutEditorState(farm);
  const withBuilding = placeLayoutEditorEntity(
    initial,
    { kind: "building", id: "builderHut-1" },
    { x: 1, y: 1 },
  ).state;
  for (const cell of [{ x: 1, y: 1 }, { x: 48, y: 0 }]) {
    const result = applyLayoutEditorWallStroke(withBuilding, "paint", [cell]);
    assert.equal(result.state, withBuilding);
    assert.match(result.error, /terrain|occupee/i);
  }
});

test("wall paint never exceeds the reserve", () => {
  const complete = createCompletedState();
  const result = applyLayoutEditorWallStroke(complete, "paint", [{ x: 0, y: 31 }]);
  assert.equal(result.state, complete);
  assert.match(result.error, /reserve/i);
});

test("validation and export remain blocked until every reserve is empty", () => {
  const state = createEmptyLayoutEditorState(farm);
  const result = validateLayoutEditorState(state);
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /22 batiments.*reserve/i);
  assert.match(result.errors.join(" "), /50 murs.*reserve/i);
  assert.match(result.errors.join(" "), /2 bombes.*reserve/i);
  assert.throws(() => serializeLayoutEditorExport(state), /reserve/i);
});

test("validation and export reject walls without integer coordinates", () => {
  const state = {
    ...createCompletedState(),
    walls: Array.from({ length: 50 }, (_, index) => ({
      id: `wall-${index + 1}`,
      type: "wall",
      level: 3,
      x: null,
      y: null,
    })),
  };
  const result = validateLayoutEditorState(state);
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /coordonnees invalides/i);
  assert.throws(() => serializeLayoutEditorExport(state), /coordonnees invalides/i);
});

test("a completed locked roster accepts disconnected wall compartments", () => {
  const state = createCompletedState();
  assert.equal(validateLayoutEditorState(state).valid, true);
  const disconnected = {
    ...state,
    walls: state.walls.map((wall, index) => index === 0
      ? { ...wall, x: 0, y: 31 }
      : wall),
  };
  const result = validateLayoutEditorState(disconnected);
  assert.equal(result.valid, true);
  assert.deepEqual(result.warnings, []);
});

test("history supports undo redo reset and avoids phantom no-op commits", () => {
  const initial = createEmptyLayoutEditorState(farm);
  const placed = placeLayoutEditorEntity(
    initial,
    { kind: "building", id: "builderHut-1" },
    { x: 1, y: 1 },
  ).state;
  let history = createLayoutEditorHistory(initial);
  assert.equal(commitLayoutEditorHistory(history, history.present), history);
  history = commitLayoutEditorHistory(history, placed);
  assert.equal(history.present.buildings.find(({ id }) => id === "builderHut-1").x, 1);
  history = undoLayoutEditorHistory(history);
  assert.equal(history.present.buildings.find(({ id }) => id === "builderHut-1").x, null);
  history = redoLayoutEditorHistory(history);
  assert.equal(history.present.buildings.find(({ id }) => id === "builderHut-1").x, 1);
  history = resetLayoutEditorHistory(history);
  assert.deepEqual(history.present, initial);
});

test("a new history commit invalidates redo without mutating prior arrays", () => {
  const initial = createEmptyLayoutEditorState(farm);
  const first = placeLayoutEditorEntity(
    initial,
    { kind: "building", id: "builderHut-1" },
    { x: 1, y: 1 },
  ).state;
  const original = createLayoutEditorHistory(initial);
  Object.freeze(original.past);
  Object.freeze(original.future);
  const committed = commitLayoutEditorHistory(original, first);
  const undone = undoLayoutEditorHistory(committed);
  Object.freeze(undone.past);
  Object.freeze(undone.future);
  const second = placeLayoutEditorEntity(
    undone.present,
    { kind: "building", id: "builderHut-1" },
    { x: 2, y: 2 },
  ).state;
  const recommitted = commitLayoutEditorHistory(undone, second);
  assert.deepEqual(recommitted.future, []);
  assert.deepEqual(undone.future, [first]);
  assert.notEqual(recommitted.past, undone.past);
  assert.notEqual(recommitted.future, undone.future);
});

test("v2 drafts preserve nullable reserve coordinates and reject v1", () => {
  const initial = createEmptyLayoutEditorState(farm);
  const placed = placeLayoutEditorEntity(
    initial,
    { kind: "building", id: "builderHut-1" },
    { x: 1, y: 1 },
  ).state;
  const restored = parseLayoutEditorDraft(serializeLayoutEditorDraft(placed), initial);
  assert.deepEqual(restored.state, placed);
  assert.equal(restored.warning, null);
  const v1 = JSON.stringify({ schema: "village-raid-layout-editor-v1", state: placed });
  const rejected = parseLayoutEditorDraft(v1, initial);
  assert.equal(rejected.state, initial);
  assert.match(rejected.warning, /incompatible/i);
  assert.match(layoutEditorDraftKey("farm-111"), /\.v2\.farm-111$/);
});

test("draft parsing restores canonical building and trap metadata", () => {
  const initial = createEmptyLayoutEditorState(farm);
  const canonicalBuilding = initial.buildings.find(({ id }) => id === "builderHut-1");
  const canonicalTrap = initial.traps.find(({ id }) => id === "bomb-1");
  const draft = {
    ...initial,
    buildings: initial.buildings.map((entity) => entity.id === canonicalBuilding.id
      ? { ...entity, x: 1, y: 1, type: "mortar", level: 999, width: 12, height: 14 }
      : entity),
    traps: initial.traps.map((entity) => entity.id === canonicalTrap.id
      ? { ...entity, x: 8, y: 8, type: "wall", level: 999 }
      : entity),
  };
  const restored = parseLayoutEditorDraft(serializeLayoutEditorDraft(draft), initial);
  assert.deepEqual(
    restored.state.buildings.find(({ id }) => id === canonicalBuilding.id),
    { ...canonicalBuilding, x: 1, y: 1 },
  );
  assert.deepEqual(
    restored.state.traps.find(({ id }) => id === canonicalTrap.id),
    { ...canonicalTrap, x: 8, y: 8 },
  );
});

test("draft parsing preserves incomplete walls with canonical metadata", () => {
  const initial = createEmptyLayoutEditorState(farm);
  const draft = {
    ...initial,
    walls: [
      { id: "forged", type: "building", level: 999, x: 2, y: 3 },
      { id: "forged-again", x: 3, y: 3 },
    ],
  };
  const restored = parseLayoutEditorDraft(serializeLayoutEditorDraft(draft), initial);
  assert.deepEqual(restored.state.walls, [
    { id: "wall-1", type: "wall", level: 3, x: 2, y: 3 },
    { id: "wall-2", type: "wall", level: 3, x: 3, y: 3 },
  ]);
  assert.equal(restored.warning, null);
});

test("draft parsing rejects mixed nullable pairs and malformed collections", () => {
  const initial = createEmptyLayoutEditorState(farm);
  const mixed = {
    ...initial,
    buildings: initial.buildings.map((entity, index) => index === 0
      ? { ...entity, x: null, y: 2 }
      : entity),
  };
  const malformed = [
    mixed,
    { ...initial, buildings: null },
    { ...initial, buildings: [null] },
    { ...initial, walls: {} },
    { ...initial, walls: [null] },
    { ...initial, traps: "invalid" },
    { ...initial, traps: [null] },
  ];
  for (const draft of malformed) {
    const restored = parseLayoutEditorDraft(serializeLayoutEditorDraft(draft), initial);
    assert.equal(restored.state, initial);
    assert.match(restored.warning, /ignore/i);
  }
});

test("draft parsing never replaces the locked inventories", () => {
  const initial = createEmptyLayoutEditorState(farm);
  for (const draft of [
    { ...initial, buildings: initial.buildings.slice(1) },
    { ...initial, traps: initial.traps.slice(1) },
    { ...initial, walls: Array.from({ length: 51 }, (_, index) => ({ x: index, y: 0 })) },
  ]) {
    const restored = parseLayoutEditorDraft(serializeLayoutEditorDraft(draft), initial);
    assert.equal(restored.state, initial);
    assert.match(restored.warning, /ignore/i);
  }
});

test("draft parsing rejects corrupt, off-grid, and overlapping state", () => {
  const initial = createEmptyLayoutEditorState(farm);
  const offGrid = placeLayoutEditorEntity(
    initial,
    { kind: "building", id: "builderHut-1" },
    { x: 1, y: 1 },
  ).state;
  offGrid.buildings = offGrid.buildings.map((entity) => entity.id === "builderHut-1"
    ? { ...entity, x: 48, y: 1 }
    : entity);
  const overlapping = {
    ...initial,
    walls: [{ x: 1, y: 1 }],
    traps: initial.traps.map((entity, index) => index === 0
      ? { ...entity, x: 1, y: 1 }
      : entity),
  };
  for (const serialized of [
    "not-json",
    serializeLayoutEditorDraft(offGrid),
    serializeLayoutEditorDraft(overlapping),
  ]) {
    const restored = parseLayoutEditorDraft(serialized, initial);
    assert.equal(restored.state, initial);
    assert.match(restored.warning, /ignore/i);
  }
});

test("reset returns a partially built village to the empty initial state", () => {
  const initial = createEmptyLayoutEditorState(farm);
  const partial = placeLayoutEditorEntity(
    initial,
    { kind: "building", id: "builderHut-1" },
    { x: 1, y: 1 },
  ).state;
  const history = commitLayoutEditorHistory(createLayoutEditorHistory(initial), partial);
  assert.deepEqual(resetLayoutEditorHistory(history).present, initial);
});

test("approved v2 export is stable, minimal, and sorted", () => {
  const state = createCompletedState();
  const first = serializeLayoutEditorExport(state);
  const second = serializeLayoutEditorExport({
    ...state,
    walls: [...state.walls].reverse(),
    traps: [...state.traps].reverse(),
  });
  assert.equal(first, second);
  const payload = JSON.parse(first);
  assert.deepEqual(Object.keys(payload), ["schema", "baseId", "buildings", "walls", "traps"]);
  assert.equal(payload.schema, "village-raid-layout-editor-v2");
  assert.equal(payload.baseId, "farm-111");
  assert.equal(Object.keys(payload.buildings).length, 22);
  assert.equal(payload.walls.length, 50);
  assert.equal(payload.traps.length, 2);
});
