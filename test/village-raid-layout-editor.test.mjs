import test from "node:test";
import assert from "node:assert/strict";
import {
  applyLayoutEditorWallStroke,
  commitLayoutEditorHistory,
  createLayoutEditorHistory,
  createLayoutEditorState,
  createScreenshotCalibration,
  layoutEditorWallReserve,
  moveLayoutEditorEntity,
  projectEditorGridPoint,
  redoLayoutEditorHistory,
  resetLayoutEditorHistory,
  snapEditorGridPoint,
  undoLayoutEditorHistory,
  unprojectEditorScreenshotPoint,
} from "../src/village-raid-layout-editor.js";
import { LAYOUTS } from "../src/village-raid-data.js";

const farm = LAYOUTS.find(({ id }) => id === "farm-111");
const defaultCalibration = createScreenshotCalibration(
  { x: 500, y: 231 }, { x: 650, y: 331 }, { x: 350, y: 331 }, { x: 22, y: 18 },
);

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
  const moved = moveLayoutEditorEntity(
    state,
    { kind: "building", id: "builderHut-1" },
    { x: 1, y: 1 },
  );
  assert.equal(moved.error, null);
  assert.deepEqual(
    moved.state.buildings.find(({ id }) => id === "builderHut-1"),
    { ...state.buildings.find(({ id }) => id === "builderHut-1"), x: 1, y: 1 },
  );
  const blocked = moveLayoutEditorEntity(
    state,
    { kind: "building", id: "builderHut-1" },
    { x: state.buildings[0].x, y: state.buildings[0].y },
  );
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
  const overCapacity = applyLayoutEditorWallStroke(
    painted.state,
    "paint",
    [{ x: 2, y: 30 }],
  );
  assert.match(overCapacity.error, /reserve/i);
  assert.equal(overCapacity.state, painted.state);
});

test("history groups one edit and supports undo redo and reset", () => {
  const initial = createLayoutEditorState(farm, defaultCalibration);
  const moved = moveLayoutEditorEntity(
    initial,
    { kind: "building", id: "builderHut-1" },
    { x: 1, y: 1 },
  ).state;
  let history = commitLayoutEditorHistory(createLayoutEditorHistory(initial), moved);
  assert.equal(history.present.buildings.find(({ id }) => id === "builderHut-1").x, 1);
  history = undoLayoutEditorHistory(history);
  assert.equal(
    history.present.buildings.find(({ id }) => id === "builderHut-1").x,
    initial.buildings.find(({ id }) => id === "builderHut-1").x,
  );
  history = redoLayoutEditorHistory(history);
  assert.equal(history.present.buildings.find(({ id }) => id === "builderHut-1").x, 1);
  history = resetLayoutEditorHistory(history);
  assert.deepEqual(history.present, initial);
});
