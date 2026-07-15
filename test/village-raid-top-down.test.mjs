import test from "node:test";
import assert from "node:assert/strict";
import {
  createRaidTopDownGeometry,
  projectRaidTopDownFootprint,
  projectRaidTopDownPoint,
  unprojectRaidTopDownPoint,
} from "../src/village-raid-top-down.js";

const grid = Object.freeze({ width: 48, height: 32 });

test("top-down geometry fits a centered square-cell grid inside 960x560", () => {
  const geometry = createRaidTopDownGeometry(960, 560, grid);
  assert.equal(geometry.tile, 16);
  assert.deepEqual(geometry.bounds, {
    left: 96,
    top: 24,
    right: 864,
    bottom: 536,
  });
  assert.equal(geometry.bounds.right - geometry.bounds.left, 48 * geometry.tile);
  assert.equal(geometry.bounds.bottom - geometry.bounds.top, 32 * geometry.tile);
});

test("top-down grid points round-trip without changing axes", () => {
  const geometry = createRaidTopDownGeometry(960, 560, grid);
  for (const point of [{ x: 0, y: 0 }, { x: 24.5, y: 16.5 }, { x: 48, y: 32 }]) {
    assert.deepEqual(
      unprojectRaidTopDownPoint(geometry, projectRaidTopDownPoint(geometry, point)),
      point,
    );
  }
});

test("top-down inverse mapping rejects points outside the fitted rectangle", () => {
  const geometry = createRaidTopDownGeometry(960, 560, grid);
  assert.equal(unprojectRaidTopDownPoint(geometry, { x: 95.99, y: 100 }), null);
  assert.equal(unprojectRaidTopDownPoint(geometry, { x: 200, y: 23.99 }), null);
  assert.deepEqual(unprojectRaidTopDownPoint(geometry, { x: 96, y: 24 }), { x: 0, y: 0 });
  assert.deepEqual(unprojectRaidTopDownPoint(geometry, { x: 864, y: 536 }), { x: 48, y: 32 });
});

test("top-down footprints preserve the exact rectangular entity size", () => {
  const geometry = createRaidTopDownGeometry(960, 560, grid);
  assert.deepEqual(projectRaidTopDownFootprint(geometry, {
    x: 10,
    y: 8,
    width: 3,
    height: 3,
  }), { x: 256, y: 152, width: 48, height: 48 });
});
