# Village Raid Isometric Fidelity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render Village Raid through a fixed 2:1 isometric projection and recalibrate bases #111, #26, and #104 so their gameplay topology visibly matches the supplied references without changing simulation rules.

**Architecture:** Keep physics, AI, pathfinding, combat, and entity coordinates on the existing 48x32 orthogonal grid. Add a pure isometric geometry module shared by rendering and hit testing, rebuild the three reference coordinate fixtures behind a user-visible comparison gate, and render every gameplay entity through one deterministic back-to-front queue.

**Tech Stack:** Static HTML, dependency-free ES modules, Canvas 2D, Node `node:test`, existing DOM/canvas mock harness, Codex in-app browser, Product Design image-to-code workflow for screenshot comparison.

## Global Constraints

- Preserve static hosting and direct `index.html` compatibility; add no dependency, build step, external font, or runtime asset request.
- Keep the 48x32 simulation grid and the 37 -> 18 -> 7 Village Raid neural network unchanged.
- Keep movement, pathfinding, collision, target selection, damage, army composition, three-base order, and strict mean-destruction fitness unchanged.
- Keep exactly 22 buildings, 50 walls, and 2 bombs in each reference layout; screenshot counts override contemporary roster assumptions.
- Reconstruct gameplay elements only: buildings, walls, traps, troops, and projectiles.
- Do not commit reference screenshots, official sprites, logos, watermarks, or temporary `.superpowers/brainstorm/` artifacts.
- Use a fixed 2:1 isometric camera; do not add rotation, panning, or free zoom.
- Keep the entire gameplay diamond visible and centered inside the logical 960x560 Canvas.
- A Cannon keeps a square 3x3 world footprint; perspective may project that square as a diamond, but its base must not become circular.
- Keep all HUD, troop-key, tooltip, and health-bar text screen-horizontal.
- Increment only `RAID_LAYOUT_VERSION` to `th3-reference-layouts-v4`; keep `SNAPSHOT_VERSION = "th3-2026-07-11-v2"`.
- Run `npm run check` before every commit and push.

---

## File Structure

- Create `src/village-raid-isometric.js`: pure geometry, projection, polygon hit testing, render depth, and stable render-queue construction.
- Create `test/village-raid-isometric.test.mjs`: projection, bounds, polygon, ordering, and frontmost-building tests.
- Modify `src/village-raid-data.js`: v4 calibrated coordinates and compatibility version.
- Modify `test/fixtures/village-raid-reference-layouts.mjs`: independent v4 signatures measured from source images.
- Modify `test/village-raid-data.test.mjs`: v4 equality, counts, topology, opening, and landmark regression tests.
- Modify `src/village-raid-rendering.js`: procedural isometric ground/entity primitives, building silhouettes, health bars, and tooltip anchoring.
- Modify `test/village-raid-rendering.test.mjs`: isometric primitive contracts, square-world-footprint checks, wall joins, and horizontal overlays.
- Modify `src/main.js`: one shared geometry object, one render queue, isometric orchestration, and projected inspection.
- Modify `test/app.test.mjs`: module wiring, pointer scaling, lifecycle, compatibility, timer, and cross-game regression tests.
- Modify `index.html` and `README.md`: v4 isometric explanation and unchanged-gameplay documentation.

---

### Task 1: Add Pure Isometric Geometry and Ordering

**Files:**
- Create: `src/village-raid-isometric.js`
- Create: `test/village-raid-isometric.test.mjs`

**Interfaces:**
- Produces: `createRaidIsoGeometry(canvasWidth, canvasHeight, grid, options?): RaidIsoGeometry`.
- Produces: `projectRaidPoint(geometry, { x, y }): { x, y }`.
- Produces: `projectRaidFootprint(geometry, entity): Array<{ x, y }>`.
- Produces: `pointInConvexPolygon(point, polygon): boolean`.
- Produces: `createRaidRenderQueue(world): Array<{ kind, entity, depth }>`.
- Produces: `findFrontmostRaidBuilding(buildings, point, geometry): Building | null`.

- [ ] **Step 1: Write failing projection, polygon, ordering, and selection tests**

Create `test/village-raid-isometric.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  createRaidIsoGeometry,
  createRaidRenderQueue,
  findFrontmostRaidBuilding,
  pointInConvexPolygon,
  projectRaidFootprint,
  projectRaidPoint,
} from "../src/village-raid-isometric.js";

const GRID = Object.freeze({ width: 48, height: 32 });

test("isometric geometry fits the complete 48x32 diamond inside 960x560", () => {
  const geometry = createRaidIsoGeometry(960, 560, GRID);
  assert.equal(geometry.halfTileWidth, 10.85);
  assert.equal(geometry.halfTileHeight, 5.425);
  assert.deepEqual(projectRaidPoint(geometry, { x: 0, y: 0 }), { x: 393.2, y: 72 });
  assert.deepEqual(projectRaidPoint(geometry, { x: 48, y: 0 }), { x: 914, y: 332.4 });
  assert.deepEqual(projectRaidPoint(geometry, { x: 48, y: 32 }), { x: 566.8, y: 506 });
  assert.deepEqual(projectRaidPoint(geometry, { x: 0, y: 32 }), { x: 46, y: 245.6 });
});

test("projected footprints use all four world-footprint corners", () => {
  const geometry = createRaidIsoGeometry(960, 560, GRID);
  const entity = { x: 20, y: 12, width: 3, height: 3 };
  assert.deepEqual(projectRaidFootprint(geometry, entity), [
    projectRaidPoint(geometry, { x: 20, y: 12 }),
    projectRaidPoint(geometry, { x: 23, y: 12 }),
    projectRaidPoint(geometry, { x: 23, y: 15 }),
    projectRaidPoint(geometry, { x: 20, y: 15 }),
  ]);
});

test("polygon hit testing includes edges and rejects nearby ground", () => {
  const polygon = [{ x: 50, y: 10 }, { x: 90, y: 30 }, { x: 50, y: 50 }, { x: 10, y: 30 }];
  assert.equal(pointInConvexPolygon({ x: 50, y: 30 }, polygon), true);
  assert.equal(pointInConvexPolygon({ x: 50, y: 10 }, polygon), true);
  assert.equal(pointInConvexPolygon({ x: 91, y: 30 }, polygon), false);
});

test("mixed entities sort deterministically from back to front", () => {
  const queue = createRaidRenderQueue({
    walls: [{ id: "wall-1", x: 4, y: 3, hp: 100 }],
    traps: [{ id: "bomb-1", x: 7, y: 5, active: true }],
    buildings: [{ id: "townHall-1", x: 8, y: 8, width: 4, height: 4, hp: 100 }],
    projectiles: [{ id: "projectile-1", x: 16, y: 10 }],
    troops: [{ id: "troop-1", x: 15, y: 12, alive: true, hp: 20 }],
  });
  assert.deepEqual(queue.map(({ kind, entity }) => `${kind}:${entity.id}`), [
    "wall:wall-1", "trap:bomb-1", "building:townHall-1",
    "projectile:projectile-1", "troop:troop-1",
  ]);
});

test("frontmost living building wins an overlapping projected hit", () => {
  const geometry = createRaidIsoGeometry(960, 560, GRID);
  const buildings = [
    { id: "back", x: 20, y: 12, width: 4, height: 4, hp: 100 },
    { id: "front", x: 21, y: 13, width: 3, height: 3, hp: 100 },
    { id: "destroyed", x: 21, y: 13, width: 3, height: 3, hp: 0 },
  ];
  const point = projectRaidPoint(geometry, { x: 22.5, y: 14.5 });
  assert.equal(findFrontmostRaidBuilding(buildings, point, geometry)?.id, "front");
});
```

- [ ] **Step 2: Verify RED**

```bash
node --test test/village-raid-isometric.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement the pure module**

Create `src/village-raid-isometric.js`:

```js
const DEFAULT_VIEW = Object.freeze({ marginX: 46, top: 72, bottom: 54 });
const KIND_ORDER = Object.freeze({ wall: 0, trap: 1, building: 2, projectile: 3, troop: 4 });

export function createRaidIsoGeometry(canvasWidth, canvasHeight, grid, options = {}) {
  const view = { ...DEFAULT_VIEW, ...options };
  const cells = grid.width + grid.height;
  const widthLimit = (canvasWidth - view.marginX * 2) / cells;
  const heightLimit = (canvasHeight - view.top - view.bottom) * 2 / cells;
  const halfTileWidth = round(Math.min(widthLimit, heightLimit));
  const halfTileHeight = round(halfTileWidth / 2);
  const diamondWidth = cells * halfTileWidth;
  const diamondHeight = cells * halfTileHeight;
  const left = round((canvasWidth - diamondWidth) / 2);
  const originX = round(left + grid.height * halfTileWidth);
  return Object.freeze({
    canvasWidth, canvasHeight, grid, halfTileWidth, halfTileHeight,
    originX, originY: view.top,
    bounds: Object.freeze({ left, top: view.top, right: round(left + diamondWidth), bottom: round(view.top + diamondHeight) }),
  });
}

export function projectRaidPoint(geometry, point) {
  return {
    x: round(geometry.originX + (point.x - point.y) * geometry.halfTileWidth),
    y: round(geometry.originY + (point.x + point.y) * geometry.halfTileHeight),
  };
}

export function projectRaidFootprint(geometry, entity) {
  const width = entity.width ?? 0;
  const height = entity.height ?? 0;
  return [
    projectRaidPoint(geometry, { x: entity.x, y: entity.y }),
    projectRaidPoint(geometry, { x: entity.x + width, y: entity.y }),
    projectRaidPoint(geometry, { x: entity.x + width, y: entity.y + height }),
    projectRaidPoint(geometry, { x: entity.x, y: entity.y + height }),
  ];
}

export function pointInConvexPolygon(point, polygon) {
  let direction = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    const cross = (end.x - start.x) * (point.y - start.y) - (end.y - start.y) * (point.x - start.x);
    if (Math.abs(cross) < 1e-7) continue;
    const next = Math.sign(cross);
    if (direction && next !== direction) return false;
    direction = next;
  }
  return true;
}

export function raidRenderDepth(entity) {
  return (entity.x ?? 0) + (entity.width ?? 0) + (entity.y ?? 0) + (entity.height ?? 0);
}

export function createRaidRenderQueue(world) {
  const entries = [
    ...(world.walls ?? []).filter(({ hp }) => hp > 0).map((entity) => entry("wall", entity, 1, 1)),
    ...(world.traps ?? []).filter(({ active }) => active).map((entity) => entry("trap", entity, 1, 1)),
    ...(world.buildings ?? []).filter(({ hp }) => hp > 0).map((entity) => entry("building", entity)),
    ...(world.projectiles ?? []).map((entity, index) => entry("projectile", { ...entity, id: entity.id ?? `projectile-${index}` }, 0, 0)),
    ...(world.troops ?? []).filter(({ alive, hp }) => alive && hp > 0).map((entity) => entry("troop", entity, 0, 0)),
  ];
  return entries.sort((left, right) => left.depth - right.depth ||
    KIND_ORDER[left.kind] - KIND_ORDER[right.kind] ||
    (left.entity.y ?? 0) - (right.entity.y ?? 0) ||
    (left.entity.x ?? 0) - (right.entity.x ?? 0) ||
    String(left.entity.id).localeCompare(String(right.entity.id)));
}

export function findFrontmostRaidBuilding(buildings, point, geometry) {
  return [...buildings].filter(({ hp }) => hp > 0)
    .sort((left, right) => raidRenderDepth(right) - raidRenderDepth(left) ||
      (right.y ?? 0) - (left.y ?? 0) ||
      (right.x ?? 0) - (left.x ?? 0) ||
      String(right.id).localeCompare(String(left.id)))
    .find((building) => pointInConvexPolygon(point, projectRaidFootprint(geometry, building))) ?? null;
}

function entry(kind, entity, width = entity.width, height = entity.height) {
  const normalized = { ...entity, width, height };
  return { kind, entity, depth: raidRenderDepth(normalized) };
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}
```

- [ ] **Step 4: Verify GREEN and commit**

```bash
node --test test/village-raid-isometric.test.mjs
npm run check
git add src/village-raid-isometric.js test/village-raid-isometric.test.mjs
git commit -m "feat: add Village Raid isometric geometry"
```

---

### Task 2: Recalibrate and Visually Approve the Three v4 Layouts

**Files:**
- Modify: `test/fixtures/village-raid-reference-layouts.mjs`
- Modify: `test/village-raid-data.test.mjs`
- Modify: `src/village-raid-data.js`
- Modify: `test/app.test.mjs`
- Temporary only: `.superpowers/brainstorm/isometric-layout-calibration/content/layout-calibration.html`

**Interfaces:**
- Consumes Task 1 projection helpers.
- Produces `RAID_LAYOUT_VERSION = "th3-reference-layouts-v4"`.
- Preserves layout IDs/order `farm-111`, `war-26`, `defence-104`.

- [ ] **Step 1: Measure the independent fixtures before production changes**

Use the original 1000x462 images:

```text
https://clashofclans-layouts.com/pics/th3_plans/farm/original/th3_farm_111.jpg?u=1766611271
https://clashofclans-layouts.com/pics/th3_plans/war/original/th3_war_26.jpg?u=1766666470
https://clashofclans-layouts.com/pics/th3_plans/defence/original/th3_defence_104.jpg?u=1766663831
```

For each source, measure the Town Hall center, the two straight-wall basis axes,
all 22 building centers, both bombs, and all 50 wall cells. Convert pixel deltas
through one inverse basis and one shared translation. Never start from the v3
production coordinates.

Write every measured integer coordinate explicitly into the existing
`EXPECTED_REFERENCE_LAYOUTS` structure: all 22 stable building IDs mapped to
their `[column, row]` top-left cells, all 50 wall `[column, row]` cells sorted by
row then column, and both bomb cells. The completed fixture must contain 66
building entries, 150 wall points, and 6 trap points before production changes.
The comment above each layout records the source URL, Town Hall pixel anchor,
and two measured pixel basis vectors.

- [ ] **Step 2: Write failing exact v4 and topology tests**

```js
test("reference layouts exactly match the user-approved isometric v4 fixtures", () => {
  assert.equal(RAID_LAYOUT_VERSION, "th3-reference-layouts-v4");
  for (const layout of LAYOUTS) {
    assert.deepEqual(layoutSignature(layout), EXPECTED_REFERENCE_LAYOUTS[layout.id], layout.id);
  }
});

test("all approved v4 walls keep their openings and connected topology", () => {
  for (const layout of LAYOUTS) {
    assert.equal(layout.walls.length, 50, layout.id);
    assert.equal(wallComponents(layout.walls).length, 1, layout.id);
  }
  assertFarm111ApprovedCompartments(LAYOUTS.find(({ id }) => id === "farm-111"));
  assertWar26ApprovedOpening(LAYOUTS.find(({ id }) => id === "war-26"));
  assertDefence104ApprovedOpeningAndDivider(LAYOUTS.find(({ id }) => id === "defence-104"));
});
```

The three assertion helpers contain explicit wall points and explicit building
IDs from the independent fixture. They must not derive expectations from
production `LAYOUTS`.

- [ ] **Step 3: Verify RED**

```bash
node --test test/village-raid-data.test.mjs test/app.test.mjs
```

Expected: v3 version and coordinate equality fail.

- [ ] **Step 4: Show a calibration comparison and stop for user approval**

Use the visual companion to show original reference left and projected fixture
right. Overlay stable building IDs, walls, openings, Town Hall anchor, and both
grid axes only in this temporary page. Ask the user to approve bases separately
in order `#111`, `#26`, `#104`. Apply corrections to the independent fixture and
comparison first. Do not modify production until all three are explicitly
approved. Never commit the comparison page or images.

- [ ] **Step 5: Replace production geometry and bump compatibility**

Copy the approved values into only the building-position, wall, and trap maps in
`src/village-raid-data.js`, then set:

```js
export const RAID_LAYOUT_VERSION = "th3-reference-layouts-v4";
```

Update Village Raid champion assertions in `test/app.test.mjs` to v4. Keep
`SNAPSHOT_VERSION` unchanged.

- [ ] **Step 6: Verify and commit**

```bash
node --test test/village-raid-data.test.mjs test/app.test.mjs
npm run check
git diff --check
git add src/village-raid-data.js test/fixtures/village-raid-reference-layouts.mjs test/village-raid-data.test.mjs test/app.test.mjs
git commit -m "fix: calibrate isometric Village Raid layouts"
```

Expected: exact fixture equality passes and no temporary visual artifact is staged.

---

### Task 3: Render Original Isometric Gameplay Miniatures

**Files:**
- Modify: `src/village-raid-rendering.js`
- Modify: `test/village-raid-rendering.test.mjs`

**Interfaces:**
- Consumes Task 1 geometry, point, footprint, and frontmost-building helpers.
- Produces `drawRaidGround`, `drawRaidWall`, `drawRaidTrap`, and `drawRaidProjectile`.
- Changes `drawRaidBuilding`, `drawRaidTroop`, `drawRaidBuildingTooltip`, and `findRaidBuildingAtPoint` to accept `geometry`.

- [ ] **Step 1: Write failing ground, wall, footprint, and overlay tests**

```js
const ISO = createRaidIsoGeometry(960, 560, GRID);

test("ground draws a centered isometric diamond instead of a rectangle", () => {
  const ctx = recordingContext();
  drawRaidGround(ctx, ISO);
  assert.deepEqual(ctx.calls.find(({ tag }) => tag === "raid-ground").points, [
    { x: 393.2, y: 72 }, { x: 914, y: 332.4 },
    { x: 566.8, y: 506 }, { x: 46, y: 245.6 },
  ]);
  assert.equal(ctx.calls.some(({ type }) => type === "strokeRect"), false);
});

test("adjacent wall cells share their complete projected edge", () => {
  const ctx = recordingContext();
  drawRaidWall(ctx, { x: 10, y: 10, hp: 100, maxHp: 100 }, ISO);
  drawRaidWall(ctx, { x: 11, y: 10, hp: 100, maxHp: 100 }, ISO);
  const tops = ctx.calls.filter(({ tag }) => tag === "wall-top");
  assert.deepEqual(tops[0].points[1], tops[1].points[0]);
  assert.deepEqual(tops[0].points[2], tops[1].points[3]);
});

test("all 13 buildings retain complete square world footprints", () => {
  for (const type of Object.keys(BUILDING_DEFINITIONS)) {
    const ctx = recordingContext();
    const building = buildingFixture(type);
    drawRaidBuilding(ctx, building, ISO);
    assert.deepEqual(ctx.calls.find(({ tag }) => tag === `${type}-base`).points,
      projectRaidFootprint(ISO, building), type);
    assert.ok(ctx.calls.some(({ tag }) => tag === `${type}-cue`), `${type} cue`);
    assert.ok(ctx.calls.some(({ tag }) => tag === `${type}-base-front-face`), `${type} height`);
  }
});
```

Retain and adapt semantic tests for Cannon wheels/barrel, Mortar turntable/tube,
Mine rails/cart, Gold Storage coins, Collector pipes, and Elixir Storage sphere.
Assert every health bar uses an unrotated `fillRect` above the raised entity.

- [ ] **Step 2: Verify RED**

```bash
node --test test/village-raid-rendering.test.mjs
```

Expected: missing isometric functions and signature mismatches fail.

- [ ] **Step 3: Add common prism and polygon primitives**

```js
const BUILDING_ISO_PROFILES = Object.freeze({
  townHall: { height: 24, cue: "crest" }, clanCastle: { height: 22, cue: "keep" },
  armyCamp: { height: 5, cue: "campfire" }, barracks: { height: 17, cue: "crossed-weapons" },
  laboratory: { height: 16, cue: "dome" }, goldMine: { height: 10, cue: "cart" },
  elixirCollector: { height: 12, cue: "pump" }, goldStorage: { height: 13, cue: "coins" },
  elixirStorage: { height: 15, cue: "sphere" }, builderHut: { height: 12, cue: "tool" },
  cannon: { height: 8, cue: "barrel" }, archerTower: { height: 26, cue: "bow" },
  mortar: { height: 8, cue: "tube" },
});

function drawIsoPrism(ctx, top, height, colors, tag) {
  const raised = top.map(({ x, y }) => ({ x, y: y - height }));
  drawPolygon(ctx, [top[3], top[2], raised[2], raised[3]], colors.left, `${tag}-left-face`);
  drawPolygon(ctx, [top[1], top[2], raised[2], raised[1]], colors.right, `${tag}-front-face`);
  drawPolygon(ctx, raised, colors.top, tag);
  return raised;
}

function drawPolygon(ctx, points, fillStyle, tag) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.stroke();
  ctx.recordPolygon?.(tag, points);
}
```

- [ ] **Step 4: Convert all renderers and semantic cues**

Implement these exact signatures:

```js
export function drawRaidGround(ctx, geometry)
export function drawRaidWall(ctx, wall, geometry)
export function drawRaidTrap(ctx, trap, geometry)
export function drawRaidBuilding(ctx, building, geometry)
export function drawRaidTroop(ctx, troop, geometry)
export function drawRaidProjectile(ctx, projectile, geometry)
export function drawRaidBuildingTooltip(ctx, building, geometry, canvasWidth, canvasHeight)
export function findRaidBuildingAtPoint(buildings, point, geometry)
```

Each building draws its full projected footprint prism using its profile height,
then reuses its approved semantic cue on the raised top center. Cannon draws two
wheels and a long barrel over its full square 3x3 prism. Mortar draws a round
turntable, elevated tube, and dark opening over its full square 3x3 prism. The
remaining eleven branches retain the exact semantic cues enumerated by
`BUILDING_ISO_PROFILES`. Call `ctx.recordCue?.(`${type}-cue`)` in each real cue
branch so the recording tests cannot pass on color alone.

Ground cell lines use projected endpoints. Walls use a 1x1 prism with height 5.
Bombs and troops use projected centers with a vertical standing offset.
Projectiles project only at draw time. Tooltip and health bars use unrotated
screen coordinates. Hit testing delegates to `findFrontmostRaidBuilding`.

- [ ] **Step 5: Verify and commit**

```bash
node --test test/village-raid-isometric.test.mjs test/village-raid-rendering.test.mjs
npm run check
git diff --check
git add src/village-raid-rendering.js test/village-raid-rendering.test.mjs
git commit -m "feat: draw isometric Village Raid entities"
```

---

### Task 4: Integrate Isometric World Drawing and Inspection

**Files:**
- Modify: `src/main.js`
- Modify: `test/app.test.mjs`

**Interfaces:**
- Consumes all Task 1 and Task 3 exports.
- Replaces `raidCanvasGeometry(): { tile, offsetX }` with `raidCanvasGeometry(): RaidIsoGeometry`.
- Preserves countdown, HUD, troop key, responsive client-to-Canvas scaling, and lifecycle state.

- [ ] **Step 1: Write failing wiring, queue, and inspection tests**

```js
assert.match(script, /createRaidIsoGeometry/);
assert.match(script, /createRaidRenderQueue/);
assert.match(script, /drawRaidGround\(targetCtx, geometry\)/);
assert.doesNotMatch(script, /RAID_GRID\.width \* tile/);
```

In runtime tests, assert `raid-ground` and `townHall-base` recording tags exist,
entity draw depths are nondecreasing, and the old large rectangular
`strokeRect` is absent. Update Town Hall pointer coordinates:

```js
const geometry = createRaidIsoGeometry(960, 560, RAID_GRID);
const center = projectRaidPoint(geometry, {
  x: townHall.x + townHall.width / 2,
  y: townHall.y + townHall.height / 2,
});
const clientPoint = canvasClientPoint(canvas, center);
```

Retain hover, leave, pin, empty click, destroyed building, Reset, game switch,
and base transition assertions. Add an overlapping-building fixture to prove the
frontmost projected footprint wins.

- [ ] **Step 2: Verify RED**

```bash
node --test test/app.test.mjs
```

Expected: orthogonal renderer wiring fails.

- [ ] **Step 3: Replace `drawRaidWorld` orchestration**

Import geometry/queue helpers and all isometric draw functions. Replace
`raidCanvasGeometry` with:

```js
function raidCanvasGeometry() {
  return createRaidIsoGeometry(WIDTH, HEIGHT, RAID_GRID);
}
```

Replace entity loops with:

```js
const geometry = raidCanvasGeometry();
drawRaidGround(targetCtx, geometry);
if (!raidWorld) return;
for (const entry of createRaidRenderQueue(raidWorld)) {
  if (entry.kind === "wall") drawRaidWall(targetCtx, entry.entity, geometry);
  if (entry.kind === "trap") drawRaidTrap(targetCtx, entry.entity, geometry);
  if (entry.kind === "building") drawRaidBuilding(targetCtx, entry.entity, geometry);
  if (entry.kind === "projectile") drawRaidProjectile(targetCtx, entry.entity, geometry);
  if (entry.kind === "troop") drawRaidTroop(targetCtx, entry.entity, geometry);
}
```

Pass the same `geometry` object to hover, click, and tooltip helpers. Draw the
tooltip, troop key, and HUD after the queue.

- [ ] **Step 4: Verify countdown and other games remain unchanged**

```bash
node --test --test-name-pattern='Village Raid renders (timeout zero|180 before accelerating|180 for exactly one frame)' test/app.test.mjs
```

Expected: all five high-speed lifecycle tests pass.

- [ ] **Step 5: Verify and commit**

```bash
node --test test/app.test.mjs test/village-raid-isometric.test.mjs test/village-raid-rendering.test.mjs
npm run check
git diff --check
git add src/main.js test/app.test.mjs
git commit -m "feat: integrate isometric Village Raid world"
```

Expected: Formula Circuit click handling and every non-Raid game test remain green.

---

### Task 5: Documentation and Final Browser Fidelity Gate

**Files:**
- Modify: `README.md`
- Modify: `index.html`
- Modify: `test/app.test.mjs`

**Interfaces:**
- Documents projection-only architecture, v4 references, fixed camera, and unchanged gameplay.
- Verifies logical 960x560 and one viewport below 760px.

- [ ] **Step 1: Write failing documentation assertions**

```js
assert.match(readme, /th3-reference-layouts-v4/);
assert.match(readme, /isometric/i);
assert.match(readme, /48x32[\s\S]*unchanged/i);
assert.match(readme, /#111[\s\S]*#26[\s\S]*#104/);
assert.match(html, /fixed 2:1 isometric/i);
assert.doesNotMatch(readme, /th3-reference-layouts-v3/);
```

- [ ] **Step 2: Verify RED, update copy, and verify GREEN**

```bash
node --test test/app.test.mjs
```

Update README and `#explanationRaid`: simulation remains on the unchanged 48x32
grid; rendering uses a fixed 2:1 projection; v4 layouts are the three
user-approved references; artwork is original and procedural; countdown and
inspection remain available. Run the focused test again and require PASS.

- [ ] **Step 3: Run static verification**

```bash
node --check src/main.js
node --check src/village-raid-isometric.js
node --check src/village-raid-data.js
node --check src/village-raid-rendering.js
node --check src/village-raid-simulation.js
npm run check
git diff --check
git status --short
```

- [ ] **Step 4: Run normal-size browser acceptance**

Serve the feature worktree and use the Codex in-app browser. At 960x560, pause
each base at 180 s and compare it to the approved calibration view. Require the
same Town Hall anchor, wall axes, wall runs, openings, compartments, and relative
building placement. Confirm the full diamond fits, six commonly confused
building types are readable, hover/pin/clear works, and Canvas/DOM countdowns
remain synchronized. Any topology mismatch reopens Task 2; do not introduce a
per-base projection.

- [ ] **Step 5: Run narrow responsive acceptance**

At a viewport below 760px, verify CSS scaling leaves the logical projection
unchanged, projected Town Hall hit testing still works, the full diamond remains
visible, and HUD/troop key are readable. Reset the viewport override afterward.

- [ ] **Step 6: Verify runtime cleanliness**

Inspect console warnings/errors and DOM resources. Require no warnings, errors,
external images, scripts, styles, fonts, game assets, or production references
to the source screenshots.

- [ ] **Step 7: Commit documentation**

```bash
npm run check
git add README.md index.html test/app.test.mjs
git commit -m "docs: describe isometric Village Raid layouts"
git status --short
git log --oneline -8
```

Expected: five focused implementation commits; temporary comparison artifacts remain unstaged.

---

## Final Review and Integration

1. Request a whole-branch review from the design commit through feature HEAD.
2. Verify exact fixtures, render ordering, projected hit testing, countdown lifecycle, static compatibility, and browser evidence.
3. Fix every Critical, High, or Important finding and re-review.
4. Run a fresh `npm run check` on the feature branch.
5. Merge only after approval and run `npm run check` again on merged `main`.
6. Push only when explicitly requested by the user.
