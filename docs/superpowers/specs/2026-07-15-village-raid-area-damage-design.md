# Village Raid: 3x3 area damage and defense range validation

## Purpose

Bring Village Raid combat behavior in line with its intended grid rules:

- A Wall Breaker explodes once on reaching its target wall and damages every
  living wall in the 3x3 cell square centered on that wall.
- A Mortar fires a projectile at the target position captured when it shoots.
  At landing, it damages every living troop whose cell is in the 3x3 square
  centered on that recorded impact cell. A troop that leaves that square before
  impact is not hit.
- Defense ranges remain explicit and regression-tested: Cannon 9 cells, Archer
  Tower 10 cells, and Mortar 4 to 11 cells inclusive.

## Scope and rules

The area is discrete, not radial: a subject is affected when both its column
and its row differ from the impact cell by at most one. The eight neighboring
cells, including diagonals, are included.

Wall Breaker area damage applies only to walls. It retains its current behavior
of dying immediately after the explosion. Damage is applied to each eligible
wall independently, so destroying several walls still increments navigation
state only as those walls become destroyed.

The Mortar's projectile remains non-homing. Its visual position interpolates
from the Mortar center to the point captured at firing time. Its damage zone is
determined from that same fixed point at impact; it does not follow the target's
later position. Cannon and Archer Tower remain single-target projectiles.

## Implementation shape

Add a small simulation-local helper that determines whether an entity occupies
the 3x3 square around an impact point by comparing rounded grid cells. Reuse it
for Wall Breaker wall selection and Mortar projectile victims. Existing radial
trap behavior is unchanged.

Continue selecting defense targets from the defense center. The range predicate
uses inclusive bounds, therefore an entity exactly on a maximum range is valid;
an entity exactly on the Mortar minimum range is valid, while one closer is not.

## Tests

In `test/village-raid-simulation.test.mjs`, add focused tests that prove:

1. one Wall Breaker damages every wall in a 3x3 cluster and leaves an adjacent
   fourth-row or fourth-column wall untouched;
2. Mortar impact damages troops in each relevant 3x3 cell, including a diagonal;
3. a troop which moves out of the saved impact square before the projectile
   lands avoids the shot;
4. the three defense range limits accept entities at their documented endpoint
   and reject entities just outside (or just inside the Mortar blind zone).

In `test/village-raid-data.test.mjs`, assert the canonical defense range values
alongside their existing balance-data assertions. Update `README.md` to state
the exact 3x3 Mortar impact rule and the equivalent Wall Breaker wall blast.

## Non-goals

- No change to troop targeting, movement, layouts, defense damage values,
  projectile speed, attack cadence, or trap radius.
- No changes to combat data other than adding range assertions, since the
  verified values already match the intended snapshot.
