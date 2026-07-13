# Village Raid Manual Layout Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local dual-view editor that lets the user manually align and place the fixed Village Raid inventories for bases #111, #26, and #104, then expose deterministic validated JSON without changing production layouts.

**Architecture:** Extend the pure isometric geometry with an inverse projection, then add one dependency-free editor model for screenshot calibration, immutable editing commands, history, validation, drafts, and export. A separate static tool page owns the two synchronized canvases and browser interactions; both views always consume the same editor state.

**Tech Stack:** Static HTML/CSS, dependency-free ES modules, Canvas 2D, browser `localStorage`, Node `node:test`, Codex in-app browser.

## Global Constraints

- Keep the 48x32 Village Raid simulation grid unchanged.
- Keep exactly 22 stable building instances, 50 total wall cells, and 2 bomb instances per base.
- Preserve base IDs and order: `farm-111`, `war-26`, `defence-104`.
- Do not modify `src/village-raid-data.js`, `test/fixtures/village-raid-reference-layouts.mjs`, `test/village-raid-data.test.mjs`, `test/app.test.mjs`, or production champion compatibility during this plan.
- Do not apply the stash named `wip: superseded automatic layout calibration`; it contains rejected automatic calibration data.
- Do not change training, combat, pathfinding, fitness, army composition, or the 180-to-0 attack timer.
- Keep Cannon and Mortar as square 3x3 world footprints.
- Use one shared editor state for screenshot and isometric views; never store a second coordinate copy in either renderer.
- Keep the fixed 2:1 application-grid projection and add no camera rotation, panning, or free zoom.
- Lock entity inventory: no add, duplicate, or delete action for buildings or bombs; wall paint capacity remains exactly 50 through a derived reserve.
- Keep all editor controls and status copy in French.
- Save drafts under `neuro-evolution-arcade.village-raid-layout-editor.v1.<base-id>`.
- Export schema identifier `village-raid-layout-editor-v1`.
- Do not commit reference screenshots, source-site assets, logos, watermarks, or temporary calibration pages.
- Add no dependency, build step, font download, or production runtime asset request.
- Keep direct static-server compatibility.
- Run `npm run check` before every commit.

---

## File Structure

- Modify `src/village-raid-isometric.js`: add inverse fixed-camera projection.
- Modify `test/village-raid-isometric.test.mjs`: cover projection round trips.
- Create `src/village-raid-layout-editor.js`: pure calibration, snapping, state commands, history, validation, draft parsing, and export.
- Create `test/village-raid-layout-editor.test.mjs`: pure editor behavior and serialization coverage.
- Create `tools/village-raid-layout-editor.html`: accessible static editor shell.
- Create `tools/village-raid-layout-editor.css`: isolated responsive editor styling.
- Create `tools/village-raid-layout-editor.js`: image loading, two-canvas rendering, pointer/keyboard controls, local drafts, and JSON presentation.
- Create `test/village-raid-layout-editor-ui.test.mjs`: static shell and source-wiring regressions.
- Modify `README.md`: local editor launch and approval workflow.

---

### Task 1: Add Bidirectional Grid and Screenshot Geometry

**Files:**
- Modify: `src/village-raid-isometric.js`
- Modify: `test/village-raid-isometric.test.mjs`
- Create: `src/village-raid-layout-editor.js`
- Create: `test/village-raid-layout-editor.test.mjs`

**Interfaces:**
- Produces: `unprojectRaidPoint(geometry, point): { x, y }`.
- Produces: `createScreenshotCalibration(anchorPx, columnHandlePx, rowHandlePx, anchorGrid, axisCells?): Calibration`.
- Produces: `projectEditorGridPoint(calibration, point): { x, y }`.
- Produces: `unprojectEditorScreenshotPoint(calibration, point): { x, y } | null`.
- Produces: `snapEditorGridPoint(point): { x, y }`.

- [ ] **Step 1: Write failing inverse-projection and screenshot-calibration tests**

Append to `test/village-raid-isometric.test.mjs`:

```js
import { unprojectRaidPoint } from "../src/village-raid-isometric.js";

test("isometric points round-trip through the fixed camera", () => {
  const geometry = createRaidIsoGeometry(960, 560, GRID);
  const world = { x: 24.25, y: 13.75 };
  const restored = unprojectRaidPoint(geometry, projectRaidPoint(geometry, world));
  assert.ok(Math.abs(restored.x - world.x) < 0.001);
  assert.ok(Math.abs(restored.y - world.y) < 0.001);
});
```

Create `test/village-raid-layout-editor.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  createScreenshotCalibration,
  projectEditorGridPoint,
  snapEditorGridPoint,
  unprojectEditorScreenshotPoint,
} from "../src/village-raid-layout-editor.js";

test("three handles define one invertible screenshot lattice", () => {
  const calibration = createScreenshotCalibration(
    { x: 1310, y: 600 },
    { x: 1527.5, y: 745 },
    { x: 1092.5, y: 745 },
    { x: 22, y: 16 },
  );
  assert.deepEqual(calibration.columnBasis, { x: 43.5, y: 29 });
  assert.deepEqual(calibration.rowBasis, { x: -43.5, y: 29 });
  const pixel = projectEditorGridPoint(calibration, { x: 28, y: 20 });
  assert.deepEqual(pixel, { x: 1397, y: 890 });
  assert.deepEqual(unprojectEditorScreenshotPoint(calibration, pixel), { x: 28, y: 20 });
  assert.deepEqual(snapEditorGridPoint({ x: 27.51, y: 19.49 }), { x: 28, y: 19 });
});

test("a singular screenshot lattice cannot be inverted", () => {
  const calibration = createScreenshotCalibration(
    { x: 100, y: 100 },
    { x: 200, y: 200 },
    { x: 300, y: 300 },
    { x: 22, y: 16 },
  );
  assert.equal(unprojectEditorScreenshotPoint(calibration, { x: 150, y: 150 }), null);
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
node --test test/village-raid-isometric.test.mjs test/village-raid-layout-editor.test.mjs
```

Expected: FAIL because `unprojectRaidPoint` and `src/village-raid-layout-editor.js` do not exist.

- [ ] **Step 3: Implement inverse isometric projection**

Add to `src/village-raid-isometric.js`:

```js
export function unprojectRaidPoint(geometry, point) {
  const horizontal = (point.x - geometry.originX) / geometry.halfTileWidth;
  const vertical = (point.y - geometry.originY) / geometry.halfTileHeight;
  return {
    x: round((horizontal + vertical) / 2),
    y: round((vertical - horizontal) / 2),
  };
}
```

- [ ] **Step 4: Implement screenshot calibration and snapping**

Create `src/village-raid-layout-editor.js` with:

```js
export const LAYOUT_EDITOR_SCHEMA = "village-raid-layout-editor-v1";
export const LAYOUT_EDITOR_GRID = Object.freeze({ width: 48, height: 32 });
export const LAYOUT_EDITOR_COUNTS = Object.freeze({ buildings: 22, walls: 50, traps: 2 });

export function createScreenshotCalibration(
  anchorPx,
  columnHandlePx,
  rowHandlePx,
  anchorGrid,
  axisCells = 5,
) {
  if (!Number.isFinite(axisCells) || axisCells <= 0) {
    throw new RangeError("axisCells must be positive");
  }
  return {
    anchorPx: clonePoint(anchorPx),
    anchorGrid: clonePoint(anchorGrid),
    columnBasis: {
      x: (columnHandlePx.x - anchorPx.x) / axisCells,
      y: (columnHandlePx.y - anchorPx.y) / axisCells,
    },
    rowBasis: {
      x: (rowHandlePx.x - anchorPx.x) / axisCells,
      y: (rowHandlePx.y - anchorPx.y) / axisCells,
    },
    axisCells,
  };
}

export function projectEditorGridPoint(calibration, point) {
  const columnDelta = point.x - calibration.anchorGrid.x;
  const rowDelta = point.y - calibration.anchorGrid.y;
  return roundPoint({
    x: calibration.anchorPx.x + columnDelta * calibration.columnBasis.x +
      rowDelta * calibration.rowBasis.x,
    y: calibration.anchorPx.y + columnDelta * calibration.columnBasis.y +
      rowDelta * calibration.rowBasis.y,
  });
}

export function unprojectEditorScreenshotPoint(calibration, point) {
  const determinant = calibration.columnBasis.x * calibration.rowBasis.y -
    calibration.columnBasis.y * calibration.rowBasis.x;
  if (Math.abs(determinant) < 1e-8) return null;
  const dx = point.x - calibration.anchorPx.x;
  const dy = point.y - calibration.anchorPx.y;
  const columnDelta = (dx * calibration.rowBasis.y - dy * calibration.rowBasis.x) /
    determinant;
  const rowDelta = (dy * calibration.columnBasis.x - dx * calibration.columnBasis.y) /
    determinant;
  return roundPoint({
    x: calibration.anchorGrid.x + columnDelta,
    y: calibration.anchorGrid.y + rowDelta,
  });
}

export function snapEditorGridPoint(point) {
  return { x: Math.round(point.x), y: Math.round(point.y) };
}

function clonePoint(point) {
  return { x: Number(point.x), y: Number(point.y) };
}

function roundPoint(point) {
  return {
    x: Math.round(point.x * 1000) / 1000,
    y: Math.round(point.y * 1000) / 1000,
  };
}
```

- [ ] **Step 5: Verify GREEN and commit**

Run:

```bash
node --test test/village-raid-isometric.test.mjs test/village-raid-layout-editor.test.mjs
npm run check
git diff --check
git add src/village-raid-isometric.js src/village-raid-layout-editor.js test/village-raid-isometric.test.mjs test/village-raid-layout-editor.test.mjs
git commit -m "feat: add Village Raid editor geometry"
```

Expected: geometry tests pass and the full suite remains green.

---

### Task 2: Add Locked Editing Commands and Per-Base History

**Files:**
- Modify: `src/village-raid-layout-editor.js`
- Modify: `test/village-raid-layout-editor.test.mjs`

**Interfaces:**
- Consumes: geometry helpers from Task 1 and production-shaped `layout` objects.
- Produces: `createLayoutEditorState(layout, calibration): EditorState`.
- Produces: `moveLayoutEditorEntity(state, selection, cell): EditResult`.
- Produces: `applyLayoutEditorWallStroke(state, mode, cells): EditResult`.
- Produces: `setLayoutEditorCalibration(state, calibration): EditorState`.
- Produces: `createLayoutEditorHistory(initialState): EditorHistory`.
- Produces: `commitLayoutEditorHistory(history, nextState): EditorHistory`.
- Produces: `undoLayoutEditorHistory(history): EditorHistory`.
- Produces: `redoLayoutEditorHistory(history): EditorHistory`.
- Produces: `resetLayoutEditorHistory(history): EditorHistory`.
- Produces: `layoutEditorWallReserve(state): number`.

- [ ] **Step 1: Write failing command, reserve, and history tests**

Append to `test/village-raid-layout-editor.test.mjs`:

```js
import {
  applyLayoutEditorWallStroke,
  commitLayoutEditorHistory,
  createLayoutEditorHistory,
  createLayoutEditorState,
  layoutEditorWallReserve,
  moveLayoutEditorEntity,
  redoLayoutEditorHistory,
  resetLayoutEditorHistory,
  undoLayoutEditorHistory,
} from "../src/village-raid-layout-editor.js";
import { LAYOUTS } from "../src/village-raid-data.js";

const farm = LAYOUTS.find(({ id }) => id === "farm-111");
const defaultCalibration = createScreenshotCalibration(
  { x: 500, y: 231 }, { x: 650, y: 331 }, { x: 350, y: 331 }, { x: 22, y: 18 },
);

test("editor state clones the locked production inventory", () => {
  const state = createLayoutEditorState(farm, defaultCalibration);
  assert.equal(state.buildings.length, 22);
  assert.equal(state.walls.length, 50);
  assert.equal(state.traps.length, 2);
  assert.equal(layoutEditorWallReserve(state), 0);
  assert.notEqual(state.buildings, farm.buildings);
});

test("valid entity moves commit while overlaps revert atomically", () => {
  const state = createLayoutEditorState(farm, defaultCalibration);
  const moved = moveLayoutEditorEntity(state, { kind: "building", id: "builderHut-1" }, { x: 1, y: 1 });
  assert.equal(moved.error, null);
  assert.deepEqual(moved.state.buildings.find(({ id }) => id === "builderHut-1"),
    { ...state.buildings.find(({ id }) => id === "builderHut-1"), x: 1, y: 1 });
  const blocked = moveLayoutEditorEntity(state, { kind: "building", id: "builderHut-1" },
    { x: state.buildings[0].x, y: state.buildings[0].y });
  assert.match(blocked.error, /chevauche/i);
  assert.equal(blocked.state, state);
});

test("wall erase and paint preserve the fixed capacity through reserve", () => {
  const state = createLayoutEditorState(farm, defaultCalibration);
  const removedCell = { x: state.walls[0].x, y: state.walls[0].y };
  const erased = applyLayoutEditorWallStroke(state, "erase", [removedCell, removedCell]);
  assert.equal(erased.state.walls.length, 49);
  assert.equal(layoutEditorWallReserve(erased.state), 1);
  const painted = applyLayoutEditorWallStroke(erased.state, "paint", [{ x: 1, y: 30 }]);
  assert.equal(painted.error, null);
  assert.equal(painted.state.walls.length, 50);
  assert.equal(layoutEditorWallReserve(painted.state), 0);
  const overCapacity = applyLayoutEditorWallStroke(painted.state, "paint", [{ x: 2, y: 30 }]);
  assert.match(overCapacity.error, /reserve/i);
  assert.equal(overCapacity.state, painted.state);
});

test("history groups one edit and supports undo redo and reset", () => {
  const initial = createLayoutEditorState(farm, defaultCalibration);
  const moved = moveLayoutEditorEntity(initial, { kind: "building", id: "builderHut-1" }, { x: 1, y: 1 }).state;
  let history = commitLayoutEditorHistory(createLayoutEditorHistory(initial), moved);
  assert.equal(history.present.buildings.find(({ id }) => id === "builderHut-1").x, 1);
  history = undoLayoutEditorHistory(history);
  assert.equal(history.present.buildings.find(({ id }) => id === "builderHut-1").x,
    initial.buildings.find(({ id }) => id === "builderHut-1").x);
  history = redoLayoutEditorHistory(history);
  assert.equal(history.present.buildings.find(({ id }) => id === "builderHut-1").x, 1);
  history = resetLayoutEditorHistory(history);
  assert.deepEqual(history.present, initial);
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
node --test test/village-raid-layout-editor.test.mjs
```

Expected: FAIL because editor state and command exports are missing.

- [ ] **Step 3: Implement cloned editor state and collision-aware entity moves**

Add to `src/village-raid-layout-editor.js`:

```js
export function createLayoutEditorState(layout, calibration) {
  return {
    schema: LAYOUT_EDITOR_SCHEMA,
    baseId: layout.id,
    calibration: structuredClone(calibration),
    requiredBuildingIds: layout.buildings.map(({ id }) => id).sort(),
    requiredTrapIds: layout.traps.map(({ id }) => id).sort(),
    buildings: layout.buildings.map((building) => ({ ...building })),
    walls: layout.walls.map((wall) => ({ ...wall })),
    traps: layout.traps.map((trap) => ({ ...trap })),
  };
}

export function moveLayoutEditorEntity(state, selection, cell) {
  const collectionName = selection.kind === "building" ? "buildings" : "traps";
  const collection = state[collectionName];
  const index = collection.findIndex(({ id }) => id === selection.id);
  if (index < 0) return { state, error: `Element inconnu: ${selection.id}` };
  const candidate = { ...collection[index], x: cell.x, y: cell.y };
  const error = candidatePlacementError(state, candidate, selection);
  if (error) return { state, error };
  const nextCollection = collection.map((entity, entityIndex) =>
    entityIndex === index ? candidate : entity
  );
  return { state: { ...state, [collectionName]: nextCollection }, error: null };
}

function candidatePlacementError(state, candidate, selection) {
  const candidateCells = entityCells(candidate);
  if (candidateCells.some(({ x, y }) => !insideGrid(x, y))) return "Element hors du terrain";
  const occupied = occupiedCells(state, selection);
  if (candidateCells.some(({ x, y }) => occupied.has(cellKey(x, y)))) {
    return "Le placement chevauche un autre element";
  }
  return null;
}

function entityCells(entity) {
  const width = entity.width ?? 1;
  const height = entity.height ?? 1;
  return Array.from({ length: width * height }, (_, index) => ({
    x: entity.x + index % width,
    y: entity.y + Math.floor(index / width),
  }));
}

function occupiedCells(state, ignored) {
  const entities = [
    ...state.buildings.filter(({ id }) => ignored.kind !== "building" || id !== ignored.id),
    ...state.walls,
    ...state.traps.filter(({ id }) => ignored.kind !== "trap" || id !== ignored.id),
  ];
  return new Set(entities.flatMap(entityCells).map(({ x, y }) => cellKey(x, y)));
}

function insideGrid(x, y) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 &&
    x < LAYOUT_EDITOR_GRID.width && y < LAYOUT_EDITOR_GRID.height;
}

function cellKey(x, y) {
  return `${x},${y}`;
}
```

- [ ] **Step 4: Implement wall strokes, derived reserve, calibration changes, and history**

Add:

```js
export function layoutEditorWallReserve(state) {
  return LAYOUT_EDITOR_COUNTS.walls - state.walls.length;
}

export function applyLayoutEditorWallStroke(state, mode, cells) {
  const unique = [...new Map(cells.map(({ x, y }) => [cellKey(x, y), { x, y }])).values()];
  if (mode === "erase") {
    const erased = new Set(unique.map(({ x, y }) => cellKey(x, y)));
    const walls = normalizeWalls(state.walls.filter(({ x, y }) => !erased.has(cellKey(x, y))));
    return { state: walls.length === state.walls.length ? state : { ...state, walls }, error: null };
  }
  if (mode !== "paint") return { state, error: "Outil de mur inconnu" };
  const existing = new Set(state.walls.map(({ x, y }) => cellKey(x, y)));
  const additions = unique.filter(({ x, y }) => !existing.has(cellKey(x, y)));
  if (additions.length > layoutEditorWallReserve(state)) return { state, error: "Reserve de murs insuffisante" };
  const occupied = occupiedCells({ ...state, walls: [] }, { kind: "wall", id: "" });
  if (additions.some(({ x, y }) => !insideGrid(x, y) || occupied.has(cellKey(x, y)))) {
    return { state, error: "Mur hors terrain ou sur une case occupee" };
  }
  const walls = normalizeWalls([...state.walls, ...additions.map(({ x, y }) => ({
    id: "wall-editor",
    type: "wall",
    level: state.walls[0]?.level ?? 3,
    x,
    y,
  }))]);
  return { state: { ...state, walls }, error: null };
}

function normalizeWalls(walls) {
  return [...walls]
    .sort((left, right) => left.y - right.y || left.x - right.x)
    .map((wall, index) => ({ ...wall, id: `wall-${index + 1}` }));
}

export function setLayoutEditorCalibration(state, calibration) {
  return { ...state, calibration: structuredClone(calibration) };
}

export function createLayoutEditorHistory(initialState) {
  return { initial: structuredClone(initialState), past: [], present: initialState, future: [] };
}

export function commitLayoutEditorHistory(history, nextState) {
  if (nextState === history.present) return history;
  return { ...history, past: [...history.past, history.present], present: nextState, future: [] };
}

export function undoLayoutEditorHistory(history) {
  if (!history.past.length) return history;
  const present = history.past.at(-1);
  return { ...history, past: history.past.slice(0, -1), present, future: [history.present, ...history.future] };
}

export function redoLayoutEditorHistory(history) {
  if (!history.future.length) return history;
  return { ...history, past: [...history.past, history.present], present: history.future[0], future: history.future.slice(1) };
}

export function resetLayoutEditorHistory(history) {
  return commitLayoutEditorHistory(history, structuredClone(history.initial));
}
```

- [ ] **Step 5: Verify GREEN and commit**

Run:

```bash
node --test test/village-raid-layout-editor.test.mjs
npm run check
git diff --check
git add src/village-raid-layout-editor.js test/village-raid-layout-editor.test.mjs
git commit -m "feat: add Village Raid editor commands"
```

Expected: command tests and full suite pass.

---

### Task 3: Add Validation, Versioned Drafts, and Deterministic Export

**Files:**
- Modify: `src/village-raid-layout-editor.js`
- Modify: `test/village-raid-layout-editor.test.mjs`

**Interfaces:**
- Produces: `validateLayoutEditorState(state): { valid, errors, warnings }`.
- Produces: `layoutEditorDraftKey(baseId): string`.
- Produces: `serializeLayoutEditorDraft(state): string`.
- Produces: `parseLayoutEditorDraft(serialized, initialState): { state, warning }`.
- Produces: `serializeLayoutEditorExport(state): string`.

- [ ] **Step 1: Write failing validation, draft, and export tests**

Append:

```js
import {
  layoutEditorDraftKey,
  parseLayoutEditorDraft,
  serializeLayoutEditorDraft,
  serializeLayoutEditorExport,
  validateLayoutEditorState,
} from "../src/village-raid-layout-editor.js";

test("validation separates blocking inventory errors from wall connectivity warnings", () => {
  const state = createLayoutEditorState(farm, defaultCalibration);
  const valid = validateLayoutEditorState(state);
  assert.equal(valid.valid, true);
  const missingWall = { ...state, walls: state.walls.slice(1) };
  const invalid = validateLayoutEditorState(missingWall);
  assert.equal(invalid.valid, false);
  assert.match(invalid.errors.join(" "), /50 murs/i);
  const disconnected = { ...state, walls: state.walls.map((wall, index) =>
    index === 0 ? { ...wall, x: 0, y: 31 } : wall
  ) };
  assert.match(validateLayoutEditorState(disconnected).warnings.join(" "), /deconnect/i);
});

test("draft parsing recovers compatible state and rejects corrupt input", () => {
  const state = createLayoutEditorState(farm, defaultCalibration);
  assert.equal(layoutEditorDraftKey("farm-111"),
    "neuro-evolution-arcade.village-raid-layout-editor.v1.farm-111");
  const restored = parseLayoutEditorDraft(serializeLayoutEditorDraft(state), state);
  assert.deepEqual(restored.state, state);
  assert.equal(restored.warning, null);
  const corrupt = parseLayoutEditorDraft("not-json", state);
  assert.equal(corrupt.state, state);
  assert.match(corrupt.warning, /ignore/i);
});

test("approved export is stable and sorts walls and bombs", () => {
  const state = createLayoutEditorState(farm, defaultCalibration);
  const first = serializeLayoutEditorExport(state);
  const second = serializeLayoutEditorExport({
    ...state,
    walls: [...state.walls].reverse(),
    traps: [...state.traps].reverse(),
  });
  assert.equal(first, second);
  const payload = JSON.parse(first);
  assert.equal(payload.schema, "village-raid-layout-editor-v1");
  assert.equal(payload.baseId, "farm-111");
  assert.equal(Object.keys(payload.buildings).length, 22);
  assert.equal(payload.walls.length, 50);
  assert.equal(payload.traps.length, 2);
});
```

- [ ] **Step 2: Verify RED**

Run `node --test test/village-raid-layout-editor.test.mjs`.

Expected: FAIL because validation and serialization exports are missing.

- [ ] **Step 3: Implement validation with non-blocking connectivity warning**

Add:

```js
export function validateLayoutEditorState(state) {
  const errors = [];
  const warnings = [];
  if (state.buildings.length !== LAYOUT_EDITOR_COUNTS.buildings) errors.push("Le village doit contenir 22 batiments");
  if (state.walls.length !== LAYOUT_EDITOR_COUNTS.walls) errors.push("Le village doit contenir 50 murs places");
  if (state.traps.length !== LAYOUT_EDITOR_COUNTS.traps) errors.push("Le village doit contenir 2 bombes");
  const buildingIds = state.buildings.map(({ id }) => id).sort();
  const trapIds = state.traps.map(({ id }) => id).sort();
  if (JSON.stringify(buildingIds) !== JSON.stringify(state.requiredBuildingIds)) {
    errors.push("Les identifiants de batiment doivent correspondre au roster verrouille");
  }
  if (JSON.stringify(trapIds) !== JSON.stringify(state.requiredTrapIds)) {
    errors.push("Les identifiants de bombe doivent correspondre au roster verrouille");
  }
  const entities = [...state.buildings, ...state.walls, ...state.traps];
  const occupied = new Map();
  for (const entity of entities) {
    for (const { x, y } of entityCells(entity)) {
      if (!insideGrid(x, y)) errors.push(`${entity.id} est hors du terrain`);
      const key = cellKey(x, y);
      if (occupied.has(key)) errors.push(`${entity.id} chevauche ${occupied.get(key)}`);
      occupied.set(key, entity.id);
    }
  }
  if (state.walls.length && wallComponentCount(state.walls) > 1) {
    warnings.push("Les murs contiennent plusieurs groupes deconnectes");
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)], warnings };
}

function wallComponentCount(walls) {
  const remaining = new Set(walls.map(({ x, y }) => cellKey(x, y)));
  let components = 0;
  while (remaining.size) {
    components += 1;
    const queue = [remaining.values().next().value];
    remaining.delete(queue[0]);
    while (queue.length) {
      const [x, y] = queue.shift().split(",").map(Number);
      for (const neighbor of [cellKey(x + 1, y), cellKey(x - 1, y), cellKey(x, y + 1), cellKey(x, y - 1)]) {
        if (remaining.delete(neighbor)) queue.push(neighbor);
      }
    }
  }
  return components;
}
```

- [ ] **Step 4: Implement draft recovery and deterministic JSON export**

Add:

```js
export function layoutEditorDraftKey(baseId) {
  return `neuro-evolution-arcade.village-raid-layout-editor.v1.${baseId}`;
}

export function serializeLayoutEditorDraft(state) {
  return JSON.stringify({ schema: LAYOUT_EDITOR_SCHEMA, state });
}

export function parseLayoutEditorDraft(serialized, initialState) {
  try {
    const payload = JSON.parse(serialized);
    if (payload.schema !== LAYOUT_EDITOR_SCHEMA || payload.state?.baseId !== initialState.baseId) {
      return { state: initialState, warning: "Brouillon incompatible ignore" };
    }
    const validation = validateLayoutEditorState(payload.state);
    if (validation.errors.some((message) => /22 batiments|identifiants/i.test(message))) {
      return { state: initialState, warning: "Brouillon invalide ignore" };
    }
    return { state: payload.state, warning: null };
  } catch {
    return { state: initialState, warning: "Brouillon illisible ignore" };
  }
}

export function serializeLayoutEditorExport(state) {
  const validation = validateLayoutEditorState(state);
  if (!validation.valid) throw new Error(validation.errors.join("; "));
  const sortCells = (left, right) => left.y - right.y || left.x - right.x;
  const buildings = Object.fromEntries(
    [...state.buildings].sort((left, right) => left.id.localeCompare(right.id))
      .map(({ id, x, y }) => [id, [x, y]]),
  );
  return JSON.stringify({
    schema: LAYOUT_EDITOR_SCHEMA,
    baseId: state.baseId,
    calibration: state.calibration,
    buildings,
    walls: [...state.walls].sort(sortCells).map(({ x, y }) => [x, y]),
    traps: [...state.traps].sort(sortCells).map(({ x, y }) => [x, y]),
  }, null, 2);
}
```

- [ ] **Step 5: Verify GREEN and commit**

Run:

```bash
node --test test/village-raid-layout-editor.test.mjs
npm run check
git diff --check
git add src/village-raid-layout-editor.js test/village-raid-layout-editor.test.mjs
git commit -m "feat: validate and export Village Raid layouts"
```

Expected: editor model tests and full suite pass.

---

### Task 4: Build the Accessible Dual-View Editor Shell

**Files:**
- Create: `tools/village-raid-layout-editor.html`
- Create: `tools/village-raid-layout-editor.css`
- Create: `tools/village-raid-layout-editor.js`
- Create: `test/village-raid-layout-editor-ui.test.mjs`

**Interfaces:**
- Consumes: `LAYOUTS`, editor model exports, and Task 1 isometric helpers.
- Produces: static route `/tools/village-raid-layout-editor.html`.
- Produces DOM IDs: `baseTabs`, `toolButtons`, `sourceImage`, `sourceCanvas`, `isoCanvas`, `entityList`, `counts`, `status`, `undoEditor`, `redoEditor`, `resetEditor`, `validateEditor`, `exportPanel`, `exportJson`.

- [ ] **Step 1: Write failing static shell test**

Create `test/village-raid-layout-editor-ui.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("manual layout editor exposes every required control and module", async () => {
  const html = await readFile(new URL("../tools/village-raid-layout-editor.html", import.meta.url), "utf8");
  for (const id of [
    "baseTabs", "toolButtons", "sourceImage", "sourceCanvas", "isoCanvas", "entityList",
    "counts", "status", "undoEditor", "redoEditor", "resetEditor", "validateEditor",
    "exportPanel", "exportJson",
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`), id);
  }
  assert.match(html, /village-raid-layout-editor\.css/);
  assert.match(html, /village-raid-layout-editor\.js/);
  assert.match(html, /Choisir une image/);
});
```

- [ ] **Step 2: Verify RED**

Run `node --test test/village-raid-layout-editor-ui.test.mjs`.

Expected: FAIL with `ENOENT` for the missing HTML file.

- [ ] **Step 3: Create the complete static HTML shell**

Create `tools/village-raid-layout-editor.html` with native buttons for the three bases, four tools, history, reset, and validation; a labeled file input; both 960x560 canvases; the stable-ID list; live regions; and a hidden export panel. Use these exact module/style references:

```html
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Editeur manuel Village Raid</title>
  <link rel="stylesheet" href="./village-raid-layout-editor.css">
</head>
<body>
  <main class="editor-shell">
    <h1>Editeur manuel Village Raid</h1>
    <div class="editor-toolbar">
      <div id="baseTabs" aria-label="Village"></div>
      <div id="toolButtons" aria-label="Outil"></div>
      <button id="undoEditor" type="button">Annuler</button>
      <button id="redoEditor" type="button">Retablir</button>
      <button id="resetEditor" type="button">Reinitialiser</button>
      <button id="validateEditor" type="button">Valider ce village</button>
    </div>
    <label>Choisir une image <input id="sourceImage" type="file" accept="image/png,image/jpeg,image/webp"></label>
    <p id="counts"></p>
    <p id="status" aria-live="polite"></p>
    <section class="editor-workspace">
      <figure class="editor-canvas-card"><figcaption>Capture originale</figcaption><canvas id="sourceCanvas" width="960" height="560"></canvas></figure>
      <figure class="editor-canvas-card"><figcaption>Vue isometrique</figcaption><canvas id="isoCanvas" width="960" height="560"></canvas></figure>
      <aside id="entityList" aria-label="Elements du village"></aside>
    </section>
    <section id="exportPanel" hidden>
      <h2>Coordonnees validees</h2>
      <textarea id="exportJson" readonly></textarea>
    </section>
  </main>
  <script type="module" src="./village-raid-layout-editor.js"></script>
</body>
</html>
```

Use `aria-pressed` on base/tool buttons, `aria-live="polite"` on `#status`, and a read-only `<textarea id="exportJson">` inside `<section id="exportPanel" hidden>`.

- [ ] **Step 4: Add responsive editor styling**

Create `tools/village-raid-layout-editor.css` with:

```css
:root { color-scheme: dark; font-family: system-ui, sans-serif; background: #10141b; color: #edf2f7; }
* { box-sizing: border-box; }
body { margin: 0; min-width: 320px; background: #10141b; }
.editor-shell { width: min(1600px, 100%); margin: 0 auto; padding: 20px; }
.editor-toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.editor-workspace { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 250px; gap: 14px; margin-top: 14px; }
.editor-canvas-card { border: 1px solid #334155; border-radius: 12px; overflow: hidden; background: #090d13; }
canvas { display: block; width: 100%; height: auto; touch-action: none; }
button[aria-pressed="true"] { border-color: #5eead4; background: #123c3a; }
.is-invalid { color: #ff8a92; }
#exportJson { width: 100%; min-height: 240px; font-family: ui-monospace, monospace; }
@media (max-width: 1100px) {
  .editor-workspace { grid-template-columns: 1fr; }
  #entityList { max-height: 260px; overflow: auto; }
}
```

- [ ] **Step 5: Add startup state, tabs, source-image loading, and synchronized redraw**

Create `tools/village-raid-layout-editor.js` importing `LAYOUTS`, `createRaidIsoGeometry`, `projectRaidFootprint`, `projectRaidPoint`, `unprojectRaidPoint`, and the editor model exports. Initialize one history per base from production layouts. Read optional same-origin query parameters `source111`, `source26`, and `source104`; otherwise use the file input for the selected base.

Implement one `render()` function that updates toolbar states, counts, entity list, status, source canvas, isometric canvas, and export visibility from the selected history's `present` state. Both canvas renderers receive that same state object.

Use this startup and redraw structure:

```js
import { LAYOUTS } from "../src/village-raid-data.js";
import { createRaidIsoGeometry, projectRaidFootprint, projectRaidPoint, unprojectRaidPoint } from "../src/village-raid-isometric.js";
import {
  createLayoutEditorHistory,
  createLayoutEditorState,
  createScreenshotCalibration,
  LAYOUT_EDITOR_GRID,
  layoutEditorDraftKey,
  layoutEditorWallReserve,
  parseLayoutEditorDraft,
  serializeLayoutEditorDraft,
} from "../src/village-raid-layout-editor.js";

const SOURCE_KEYS = Object.freeze({
  "farm-111": "source111",
  "war-26": "source26",
  "defence-104": "source104",
});
const params = new URLSearchParams(location.search);
const histories = new Map(LAYOUTS.map((layout) => {
  const townHall = layout.buildings.find(({ id }) => id === "townHall-1");
  const calibration = createScreenshotCalibration(
    { x: 480, y: 280 }, { x: 630, y: 380 }, { x: 330, y: 380 },
    { x: townHall.x + townHall.width / 2, y: townHall.y + townHall.height / 2 },
  );
  const initial = createLayoutEditorState(layout, calibration);
  const serialized = localStorage.getItem(layoutEditorDraftKey(layout.id));
  const restored = serialized ? parseLayoutEditorDraft(serialized, initial) : { state: initial, warning: null };
  return [layout.id, createLayoutEditorHistory(restored.state)];
}));

let selectedBaseId = LAYOUTS[0].id;
let selectedTool = "align";
let selectedEntity = null;
let preview = null;

function currentHistory() {
  return histories.get(selectedBaseId);
}

function render() {
  const state = currentHistory().present;
  renderToolbar(state);
  renderCounts(state, layoutEditorWallReserve(state));
  renderEntityList(state, selectedEntity);
  renderSourceCanvas(state, preview);
  renderIsoCanvas(state, preview, createRaidIsoGeometry(960, 560, LAYOUT_EDITOR_GRID));
}

for (const [baseId, key] of Object.entries(SOURCE_KEYS)) {
  const source = params.get(key);
  if (source) loadSourceImage(baseId, source);
}
render();
```

- [ ] **Step 6: Verify shell GREEN and commit**

Run:

```bash
node --test test/village-raid-layout-editor-ui.test.mjs
npm run check
git diff --check
git add tools/village-raid-layout-editor.html tools/village-raid-layout-editor.css tools/village-raid-layout-editor.js test/village-raid-layout-editor-ui.test.mjs
git commit -m "feat: add Village Raid layout editor shell"
```

Expected: shell test and full suite pass.

---

### Task 5: Wire Dragging, Alignment, Wall Brush, Drafts, and Visible Approval

**Files:**
- Modify: `tools/village-raid-layout-editor.js`
- Modify: `test/village-raid-layout-editor-ui.test.mjs`
- Modify: `README.md`

**Interfaces:**
- Consumes all Task 1-4 interfaces.
- Produces a fully usable manual editor with per-base drafts and visible JSON.

- [ ] **Step 1: Extend the UI regression test with interaction wiring contracts**

Append:

```js
test("editor script wires pointer keyboard draft and validation flows", async () => {
  const script = await readFile(new URL("../tools/village-raid-layout-editor.js", import.meta.url), "utf8");
  assert.match(script, /pointerdown/);
  assert.match(script, /pointermove/);
  assert.match(script, /pointerup/);
  assert.match(script, /keydown/);
  assert.match(script, /layoutEditorDraftKey/);
  assert.match(script, /serializeLayoutEditorExport/);
  assert.match(script, /localStorage\.setItem/);
  assert.match(script, /exportJson/);
});
```

- [ ] **Step 2: Verify RED**

Run `node --test test/village-raid-layout-editor-ui.test.mjs`.

Expected: FAIL until every interaction contract is wired.

- [ ] **Step 3: Wire alignment and entity drag transactions on both canvases**

In `tools/village-raid-layout-editor.js`, map source-canvas points into natural image pixels before calling `unprojectEditorScreenshotPoint`. Map isometric-canvas points with `unprojectRaidPoint`. During pointer movement, render a candidate preview; on pointer release, call `moveLayoutEditorEntity` and commit exactly one history entry. Alignment drags rebuild calibration with the anchor plus two five-cell handles and also commit once per completed drag.

Use pointer capture so dragging remains stable outside the initial cell. `Escape` cancels the active preview. Arrow keys call the same entity move command with a one-cell delta.

Use one shared mapping and commit path:

```js
function pointerGridPoint(canvas, event, state) {
  const rect = canvas.getBoundingClientRect();
  const canvasPoint = {
    x: (event.clientX - rect.left) * canvas.width / rect.width,
    y: (event.clientY - rect.top) * canvas.height / rect.height,
  };
  if (canvas === isoCanvas) {
    return snapEditorGridPoint(unprojectRaidPoint(
      createRaidIsoGeometry(960, 560, LAYOUT_EDITOR_GRID),
      canvasPoint,
    ));
  }
  const image = sourceImages.get(selectedBaseId);
  const imagePoint = {
    x: canvasPoint.x * image.naturalWidth / sourceCanvas.width,
    y: canvasPoint.y * image.naturalHeight / sourceCanvas.height,
  };
  const world = unprojectEditorScreenshotPoint(state.calibration, imagePoint);
  return world ? snapEditorGridPoint(world) : null;
}

function commitEntityDrop(cell) {
  const history = currentHistory();
  const result = moveLayoutEditorEntity(history.present, selectedEntity, cell);
  if (result.error) {
    setStatus(result.error, true);
    preview = null;
    render();
    return;
  }
  histories.set(selectedBaseId, commitLayoutEditorHistory(history, result.state));
  persistCurrentDraft();
  preview = null;
  hideExport();
  render();
}
```

Candidate rendering must use `candidatePlacementError` through `moveLayoutEditorEntity`: valid previews use cyan, invalid previews use red, and invalid `pointerup` restores the existing state.

- [ ] **Step 4: Wire one-history-entry wall strokes and reserve feedback**

For the `Murs` tool, collect unique snapped cells between `pointerdown` and `pointerup`. Render the stroke preview without mutating history. On release, call `applyLayoutEditorWallStroke` once with `paint` or `erase`, then commit once. The erase mode is selected explicitly in the toolbar; painting disables itself when `layoutEditorWallReserve(state) === 0`.

Use this transaction boundary:

```js
let wallStroke = null;

function startWallStroke(mode, cell) {
  wallStroke = { mode, cells: new Map([[`${cell.x},${cell.y}`, cell]]) };
}

function extendWallStroke(cell) {
  if (!wallStroke) return;
  wallStroke.cells.set(`${cell.x},${cell.y}`, cell);
  preview = { kind: "wall-stroke", mode: wallStroke.mode, cells: [...wallStroke.cells.values()] };
  render();
}

function finishWallStroke() {
  if (!wallStroke) return;
  const history = currentHistory();
  const result = applyLayoutEditorWallStroke(history.present, wallStroke.mode, [...wallStroke.cells.values()]);
  wallStroke = null;
  preview = null;
  if (result.error) return setStatus(result.error, true);
  histories.set(selectedBaseId, commitLayoutEditorHistory(history, result.state));
  persistCurrentDraft();
  hideExport();
  render();
}
```

- [ ] **Step 5: Wire base drafts, reset confirmation, validation, and visible JSON**

After every accepted history change, call:

```js
localStorage.setItem(layoutEditorDraftKey(state.baseId), serializeLayoutEditorDraft(state));
```

At startup, parse each available draft with `parseLayoutEditorDraft`. Announce ignored drafts in `#status`. Reset calls `window.confirm("Reinitialiser ce village ?")` before committing `resetLayoutEditorHistory`.

Validation renders blocking errors and warnings in both views. When valid, set `#exportJson.value = serializeLayoutEditorExport(state)` and reveal `#exportPanel`; any later edit hides the stale export until validation runs again.

Wire the handlers explicitly:

```js
function persistCurrentDraft() {
  const state = currentHistory().present;
  localStorage.setItem(layoutEditorDraftKey(state.baseId), serializeLayoutEditorDraft(state));
}

validateEditor.addEventListener("click", () => {
  const state = currentHistory().present;
  const result = validateLayoutEditorState(state);
  renderValidation(result);
  if (!result.valid) return hideExport();
  exportJson.value = serializeLayoutEditorExport(state);
  exportPanel.hidden = false;
});

resetEditor.addEventListener("click", () => {
  if (!window.confirm("Reinitialiser ce village ?")) return;
  histories.set(selectedBaseId, resetLayoutEditorHistory(currentHistory()));
  persistCurrentDraft();
  hideExport();
  render();
});

sourceImage.addEventListener("change", () => {
  const file = sourceImage.files?.[0];
  if (!file) return;
  loadSourceImage(selectedBaseId, URL.createObjectURL(file));
});
```

If an image fails to decode, keep the grid editor active, clear only that base's source image, and announce `Image source illisible - choisissez un autre fichier` in `#status`.

- [ ] **Step 6: Document the local workflow**

Add to `README.md` a `Manual Village Raid layout editor` subsection containing:

```text
Serve the repository with a static server and open /tools/village-raid-layout-editor.html.
Reference screenshots are selected locally or supplied as same-origin development URLs; they are never committed.
Validate #111, #26, and #104 separately, then use the visible JSON exports as the only approved source for production layout changes.
```

- [ ] **Step 7: Run automated verification and commit**

Run:

```bash
node --test test/village-raid-layout-editor.test.mjs test/village-raid-layout-editor-ui.test.mjs test/village-raid-isometric.test.mjs
npm run check
git diff --check
git add tools/village-raid-layout-editor.js test/village-raid-layout-editor-ui.test.mjs README.md
git commit -m "feat: complete manual Village Raid layout editing"
```

Expected: all editor-focused tests and full suite pass.

- [ ] **Step 8: Verify visually in the Codex in-app browser and stop for user editing**

Serve the worktree and open this local URL in the in-app browser:

```text
http://127.0.0.1:61014/tools/village-raid-layout-editor.html?source111=/.superpowers/sdd/assets/originals/th3_farm_111.jpg&source26=/.superpowers/sdd/assets/originals/th3_war_26.jpg&source104=/.superpowers/sdd/assets/originals/th3_defence_104.jpg
```

Verify at normal and narrow desktop widths:

- all three images load only from ignored local scratch paths;
- alignment handles update only screenshot calibration;
- buildings and bombs drag in both views and snap to integer cells;
- invalid placements turn red and revert;
- erase adds wall reserve and paint consumes it;
- one wall stroke is one undo step;
- base switching restores independent drafts;
- reload restores drafts;
- reset requires confirmation;
- validation distinguishes errors from disconnected-wall warning;
- valid state reveals stable sorted JSON;
- browser console contains no errors.

Leave the editor tab open with `#111` selected. Do not change production layout data. Ask the user to align and validate #111 manually before any #26 or #104 production work.

---

## Completion Boundary

This plan is complete when the manual editor is tested, open, and ready for the user. It intentionally does not import any exported coordinates into production. A separate approved plan will consume the three user-validated JSON exports, bump the layout version, finish the isometric production renderer, and rerun gameplay regression tests.
