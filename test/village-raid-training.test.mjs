import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createRaidBasePlan,
  meanRaidDestruction,
} from "../src/village-raid-training.js";
import { createRaidWorld } from "../src/village-raid-simulation.js";

test("raid fitness is the strict arithmetic mean of the three bases", () => {
  assert.equal(meanRaidDestruction([12, 48, 90]), 50);
  assert.equal(meanRaidDestruction([]), 0);
});

test("each raid base plan creates an independent full simulation inventory", () => {
  const composition = { barbarian: 12, archer: 8, giant: 6, goblin: 10, wallBreaker: 5 };
  const first = createRaidBasePlan(0, composition);
  const second = createRaidBasePlan(1, composition);
  const firstWorld = createRaidWorld(first.baseIndex, first.composition);
  const secondWorld = createRaidWorld(second.baseIndex, second.composition);

  firstWorld.inventory.barbarian = 0;
  first.composition.archer = 0;

  assert.deepEqual(secondWorld.inventory, composition);
  assert.deepEqual(second.composition, composition);
  assert.notEqual(firstWorld.inventory, secondWorld.inventory);
});
