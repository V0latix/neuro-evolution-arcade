# Village Raid Deployment Zone Design

## Goal

Allow Village Raid troops to deploy anywhere on the 48 by 32 simulation grid
when the selected cell is free and is more than one cell away from every
building. A building's exclusion zone remains blocked after that building is
destroyed.

## Scope

- Replace perimeter-only deployment with grid-wide deployment for the Village
  Raid simulation.
- Keep the existing seven-output raid network and saved champion compatibility.
- Use one shared deployment-zone model for direct simulation calls and AI
  actions.
- Treat cells occupied by buildings, walls, or traps as unavailable.
- Do not change movement, targeting, combat, fitness, or layout editing.

## Deployment Zone

At world creation, derive an ordered list of deployable grid cells from the
original layout entities. A candidate cell is valid only when all of these are
true:

1. It is inside the grid.
2. It is not occupied by a building, wall, or trap.
3. Its Chebyshev distance from the full rectangular footprint of each building
   is strictly greater than one cell. The building itself and every orthogonal
   or diagonal neighboring cell are therefore excluded.

Store this list on the raid world. It is intentionally immutable gameplay
topology: destruction changes building HP but never changes deployment
availability.

## Position Selection

The existing normalized position output remains in the `0..1` range. Instead
of mapping it to the perimeter, map it to an index in the stable ordered list
of valid deployment cells. A deployed troop starts at the center of that cell.
The existing small deterministic troop-spread offset is applied only when it
can be projected back into a valid deployment location; it must never place a
troop into an excluded cell.

This retains the current network shape (37 inputs, 18 hidden nodes, 7 outputs)
and the saved Village Raid champions remain loadable.

## Error Handling

`deployTroop` retains its existing validation of troop types, normalized
positions, inventory, decision cadence, and completed worlds. If a custom
layout has no valid deployment cells, it returns `null` without consuming a
troop.

## Tests

Extend the Village Raid simulation tests to prove that:

- all generated deployment cells are free and outside the one-cell buffer of
  every original building footprint;
- deployment can select an interior valid cell, not just the old perimeter;
- a destroyed building keeps its exclusion zone blocked;
- deployed troop coordinates are always valid positions; and
- an empty candidate list safely prevents deployment.

Run `npm run check` before committing and before handoff.
