# Village Raid: user-calibrated default layouts

## Goal

Replace the three bundled Village Raid layouts with the completed top-down
coordinates supplied by the user. The main game must use these coordinates for
new sessions without requiring an editor-local override.

## Scope

- Replace the default positions for `farm-111`, `war-26`, and `defence-104` in
  `src/village-raid-data.js`.
- Preserve the fixed TH3 inventory for every layout: 22 buildings, 50 walls,
  and 2 bombs.
- Change the shared `armyCamp` footprint from 5 by 5 cells to 4 by 4 cells.
- Update the independent reference fixture to exactly match the supplied JSON.
- Update coordinate and footprint tests so they prove the new data is valid and
  the 4 by 4 camp footprint reaches both the editor and gameplay layouts.

## Data flow

The static coordinate maps in `src/village-raid-data.js` are converted through
the existing `makeLayout` function. Their building metadata, including the
reduced camp footprint, is then consumed unchanged by the editor, renderer,
collision logic, and raid simulation. No storage schema or editor export format
changes are required.

## Validation and compatibility

Existing layout validation remains authoritative for grid bounds, duplicate
cells, entity overlap, and fixed roster counts. User-supplied plans may contain
separate wall compartments; these are valid and must not generate a warning.
Existing local editor overrides retain their v2 schema and continue to replace
the corresponding bundled layout when applied.

## Tests

- A fixture equality test locks every supplied building, wall, and trap
  coordinate for all three bases.
- Inventory and layout-validation tests remain green for each base.
- A building-definition test asserts that army camps are 4 by 4 cells and that
  the roster inherits those dimensions.

## Out of scope

- No change to the editor UI, stored editor drafts, combat balance, troop AI,
  or the two source reference images.
