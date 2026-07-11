export function meanRaidDestruction(results) {
  if (!Array.isArray(results) || results.length === 0) return 0;
  return results.reduce((sum, value) => sum + value, 0) / results.length;
}

export function createRaidBasePlan(baseIndex, composition) {
  return {
    baseIndex,
    composition: { ...composition },
  };
}
