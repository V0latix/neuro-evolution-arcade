export const LAYOUT_EDITOR_SCHEMA = "village-raid-layout-editor-v2";
export const LAYOUT_EDITOR_GRID = Object.freeze({ width: 48, height: 32 });
export const LAYOUT_EDITOR_COUNTS = Object.freeze({ buildings: 22, walls: 50, traps: 2 });

export function createEmptyLayoutEditorState(layout) {
  return {
    schema: LAYOUT_EDITOR_SCHEMA,
    baseId: layout.id,
    requiredBuildingIds: layout.buildings.map(({ id }) => id).sort(),
    requiredTrapIds: layout.traps.map(({ id }) => id).sort(),
    buildings: layout.buildings.map((building) => ({
      ...building,
      x: null,
      y: null,
    })),
    walls: [],
    traps: layout.traps.map((trap) => ({
      ...trap,
      x: null,
      y: null,
    })),
  };
}

export function isLayoutEditorEntityPlaced(entity) {
  return Number.isInteger(entity.x) && Number.isInteger(entity.y);
}

export function layoutEditorReserveCounts(state) {
  return {
    buildings: state.buildings.filter((entity) => !isLayoutEditorEntityPlaced(entity)).length,
    walls: LAYOUT_EDITOR_COUNTS.walls - state.walls.length,
    traps: state.traps.filter((entity) => !isLayoutEditorEntityPlaced(entity)).length,
  };
}

export function placeLayoutEditorEntity(state, selection, cell) {
  const collectionName = entityCollectionName(selection.kind);
  if (!collectionName) {
    return { state, error: `Type d'element inconnu: ${selection.kind}` };
  }
  const collection = state[collectionName];
  const index = collection.findIndex(({ id }) => id === selection.id);
  if (index < 0) return { state, error: `Element inconnu: ${selection.id}` };
  if (collection[index].x === cell?.x && collection[index].y === cell?.y) {
    return { state, error: null };
  }
  const candidate = { ...collection[index], x: cell?.x, y: cell?.y };
  const error = candidatePlacementError(state, candidate, selection);
  if (error) return { state, error };
  return {
    state: {
      ...state,
      [collectionName]: collection.map((entity, entityIndex) =>
        entityIndex === index ? candidate : entity
      ),
    },
    error: null,
  };
}

export function removeLayoutEditorEntity(state, selection) {
  const collectionName = entityCollectionName(selection.kind);
  if (!collectionName) {
    return { state, error: `Type d'element inconnu: ${selection.kind}` };
  }
  const collection = state[collectionName];
  const index = collection.findIndex(({ id }) => id === selection.id);
  if (index < 0) return { state, error: `Element inconnu: ${selection.id}` };
  if (!isLayoutEditorEntityPlaced(collection[index])) return { state, error: null };
  return {
    state: {
      ...state,
      [collectionName]: collection.map((entity, entityIndex) => entityIndex === index
        ? { ...entity, x: null, y: null }
        : entity),
    },
    error: null,
  };
}

function entityCollectionName(kind) {
  if (kind === "building") return "buildings";
  if (kind === "trap") return "traps";
  return null;
}

function candidatePlacementError(state, candidate, selection) {
  if (!isLayoutEditorEntityPlaced(candidate)) return "Element hors du terrain";
  const candidateCells = entityCells(candidate);
  if (candidateCells.some(({ x, y }) => !insideGrid(x, y))) return "Element hors du terrain";
  const occupied = occupiedCells(state, selection);
  if (candidateCells.some(({ x, y }) => occupied.has(cellKey(x, y)))) {
    return "Le placement chevauche un autre element";
  }
  return null;
}

function entityCells(entity) {
  if (!isLayoutEditorEntityPlaced(entity)) return [];
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

export function layoutEditorWallReserve(state) {
  return LAYOUT_EDITOR_COUNTS.walls - state.walls.length;
}

export function applyLayoutEditorWallStroke(state, mode, cells) {
  const unique = [...new Map(cells.map(({ x, y }) => [cellKey(x, y), { x, y }])).values()];
  if (mode === "erase") {
    const erased = new Set(unique.map(({ x, y }) => cellKey(x, y)));
    const walls = normalizeWalls(
      state.walls.filter(({ x, y }) => !erased.has(cellKey(x, y))),
    );
    return {
      state: walls.length === state.walls.length ? state : { ...state, walls },
      error: null,
    };
  }
  if (mode !== "paint") return { state, error: "Outil de mur inconnu" };
  const existing = new Set(state.walls.map(({ x, y }) => cellKey(x, y)));
  const additions = unique.filter(({ x, y }) => !existing.has(cellKey(x, y)));
  if (!additions.length) return { state, error: null };
  if (additions.length > layoutEditorWallReserve(state)) {
    return { state, error: "Reserve de murs insuffisante" };
  }
  const occupied = occupiedCells({ ...state, walls: [] }, { kind: "wall", id: "" });
  if (additions.some(({ x, y }) => !insideGrid(x, y) || occupied.has(cellKey(x, y)))) {
    return { state, error: "Mur hors terrain ou sur une case occupee" };
  }
  const walls = normalizeWalls([
    ...state.walls,
    ...additions.map(({ x, y }) => ({
      id: "wall-editor",
      type: "wall",
      level: 3,
      x,
      y,
    })),
  ]);
  return { state: { ...state, walls }, error: null };
}

function normalizeWalls(walls) {
  return [...walls]
    .sort((left, right) => left.y - right.y || left.x - right.x)
    .map((wall, index) => ({ ...wall, id: `wall-${index + 1}` }));
}

export function validateLayoutEditorState(state) {
  const errors = [];
  const warnings = [];
  if (state.buildings.length !== LAYOUT_EDITOR_COUNTS.buildings) {
    errors.push("Le village doit contenir 22 batiments");
  }
  if (state.walls.length > LAYOUT_EDITOR_COUNTS.walls) {
    errors.push("Le village ne peut pas contenir plus de 50 murs");
  }
  if (state.traps.length !== LAYOUT_EDITOR_COUNTS.traps) {
    errors.push("Le village doit contenir 2 bombes");
  }

  const buildingIds = state.buildings.map(({ id }) => id).sort();
  const trapIds = state.traps.map(({ id }) => id).sort();
  if (JSON.stringify(buildingIds) !== JSON.stringify(state.requiredBuildingIds)) {
    errors.push("Les identifiants de batiment doivent correspondre au roster verrouille");
  }
  if (JSON.stringify(trapIds) !== JSON.stringify(state.requiredTrapIds)) {
    errors.push("Les identifiants de bombe doivent correspondre au roster verrouille");
  }

  const reserves = layoutEditorReserveCounts(state);
  if (reserves.buildings) {
    errors.push(`${reserves.buildings} batiments restent en reserve`);
  }
  if (reserves.walls > 0) errors.push(`${reserves.walls} murs restent en reserve`);
  if (reserves.traps) errors.push(`${reserves.traps} bombes restent en reserve`);

  const entities = [...state.buildings, ...state.walls, ...state.traps];
  const occupied = new Map();
  for (const entity of entities) {
    if (!hasValidCoordinatePair(entity)) {
      errors.push(`${entity.id ?? "Element"} a des coordonnees invalides`);
      continue;
    }
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

function hasValidCoordinatePair(entity) {
  return (entity.x === null && entity.y === null) || isLayoutEditorEntityPlaced(entity);
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
      for (const neighbor of [
        cellKey(x + 1, y),
        cellKey(x - 1, y),
        cellKey(x, y + 1),
        cellKey(x, y - 1),
      ]) {
        if (remaining.delete(neighbor)) queue.push(neighbor);
      }
    }
  }
  return components;
}

export function layoutEditorDraftKey(baseId) {
  return `neuro-evolution-arcade.village-raid-layout-editor.v2.${baseId}`;
}

export function serializeLayoutEditorDraft(state) {
  return JSON.stringify({ schema: LAYOUT_EDITOR_SCHEMA, state });
}

export function parseLayoutEditorDraft(serialized, initialState) {
  try {
    const payload = JSON.parse(serialized);
    if (!isRecord(payload) || payload.schema !== LAYOUT_EDITOR_SCHEMA ||
      payload.state?.baseId !== initialState.baseId) {
      return { state: initialState, warning: "Brouillon incompatible ignore" };
    }
    const draftState = payload.state;
    if (!isRecord(draftState) || !Array.isArray(draftState.buildings) ||
      !Array.isArray(draftState.walls) || !Array.isArray(draftState.traps)) {
      return { state: initialState, warning: "Brouillon invalide ignore" };
    }
    const buildings = restoreStableEntityCoordinates(
      draftState.buildings,
      initialState.buildings,
    );
    const traps = restoreStableEntityCoordinates(draftState.traps, initialState.traps);
    const walls = restoreWallCoordinates(draftState.walls);
    if (!buildings || !traps || !walls) {
      return { state: initialState, warning: "Brouillon invalide ignore" };
    }
    const candidate = {
      ...initialState,
      requiredBuildingIds: [...initialState.requiredBuildingIds],
      requiredTrapIds: [...initialState.requiredTrapIds],
      buildings,
      walls,
      traps,
    };
    const validation = validateLayoutEditorState(candidate);
    if (validation.errors.some((message) => !/rest(?:e|ent) en reserve/i.test(message))) {
      return { state: initialState, warning: "Brouillon invalide ignore" };
    }
    return { state: candidate, warning: null };
  } catch {
    return { state: initialState, warning: "Brouillon illisible ignore" };
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function restoreStableEntityCoordinates(draftEntities, initialEntities) {
  if (draftEntities.length !== initialEntities.length) return null;
  const draftById = new Map();
  for (const entity of draftEntities) {
    if (!isRecord(entity) || typeof entity.id !== "string" ||
      !hasValidCoordinatePair(entity) || draftById.has(entity.id)) {
      return null;
    }
    draftById.set(entity.id, entity);
  }
  if (initialEntities.some(({ id }) => !draftById.has(id))) return null;
  return initialEntities.map((entity) => {
    const draft = draftById.get(entity.id);
    return { ...entity, x: draft.x, y: draft.y };
  });
}

function restoreWallCoordinates(draftWalls) {
  if (draftWalls.length > LAYOUT_EDITOR_COUNTS.walls) return null;
  const restored = [];
  for (const [index, wall] of draftWalls.entries()) {
    if (!isRecord(wall) || !Number.isInteger(wall.x) || !Number.isInteger(wall.y)) {
      return null;
    }
    restored.push({
      id: `wall-${index + 1}`,
      type: "wall",
      level: 3,
      x: wall.x,
      y: wall.y,
    });
  }
  return restored;
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
    buildings,
    walls: [...state.walls].sort(sortCells).map(({ x, y }) => [x, y]),
    traps: [...state.traps].sort(sortCells).map(({ x, y }) => [x, y]),
  }, null, 2);
}

export function createLayoutEditorHistory(initialState) {
  return { initial: structuredClone(initialState), past: [], present: initialState, future: [] };
}

export function commitLayoutEditorHistory(history, nextState) {
  if (nextState === history.present) return history;
  return {
    ...history,
    past: [...history.past, history.present],
    present: nextState,
    future: [],
  };
}

export function undoLayoutEditorHistory(history) {
  if (!history.past.length) return history;
  const present = history.past.at(-1);
  return {
    ...history,
    past: history.past.slice(0, -1),
    present,
    future: [history.present, ...history.future],
  };
}

export function redoLayoutEditorHistory(history) {
  if (!history.future.length) return history;
  return {
    ...history,
    past: [...history.past, history.present],
    present: history.future[0],
    future: history.future.slice(1),
  };
}

export function resetLayoutEditorHistory(history) {
  return commitLayoutEditorHistory(history, structuredClone(history.initial));
}
