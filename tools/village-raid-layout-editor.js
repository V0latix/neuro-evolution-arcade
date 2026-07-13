import { LAYOUTS } from "../src/village-raid-data.js";
import {
  createRaidIsoGeometry,
  projectRaidFootprint,
  projectRaidPoint,
  unprojectRaidPoint,
} from "../src/village-raid-isometric.js";
import {
  createLayoutEditorHistory,
  createLayoutEditorState,
  createScreenshotCalibration,
  LAYOUT_EDITOR_GRID,
  layoutEditorDraftKey,
  layoutEditorWallReserve,
  parseLayoutEditorDraft,
  projectEditorGridPoint,
  redoLayoutEditorHistory,
  resetLayoutEditorHistory,
  serializeLayoutEditorDraft,
  serializeLayoutEditorExport,
  undoLayoutEditorHistory,
  unprojectEditorScreenshotPoint,
  validateLayoutEditorState,
} from "../src/village-raid-layout-editor.js";

const SOURCE_KEYS = Object.freeze({
  "farm-111": "source111",
  "war-26": "source26",
  "defence-104": "source104",
});
const BASE_LABELS = Object.freeze({
  "farm-111": "Ferme 111",
  "war-26": "Guerre 26",
  "defence-104": "Defense 104",
});
const TOOLS = Object.freeze([
  { id: "align", label: "Aligner la grille" },
  { id: "move", label: "Deplacer un element" },
  { id: "paint", label: "Peindre un mur" },
  { id: "erase", label: "Effacer un mur" },
]);
const KIND_LABELS = Object.freeze({
  building: "Batiments",
  wall: "Murs",
  trap: "Bombes",
});
const ENTITY_TYPE_LABELS = Object.freeze({
  townHall: "Hotel de ville",
  clanCastle: "Chateau de clan",
  armyCamp: "Camp militaire",
  barracks: "Caserne",
  laboratory: "Laboratoire",
  goldMine: "Mine d'or",
  elixirCollector: "Extracteur d'elixir",
  goldStorage: "Reserve d'or",
  elixirStorage: "Reserve d'elixir",
  builderHut: "Cabane d'ouvrier",
  cannon: "Canon",
  archerTower: "Tour d'archers",
  mortar: "Mortier",
  wall: "Mur",
  bomb: "Bombe",
});

const elements = {
  baseTabs: document.querySelector("#baseTabs"),
  toolButtons: document.querySelector("#toolButtons"),
  sourceImage: document.querySelector("#sourceImage"),
  sourceCanvas: document.querySelector("#sourceCanvas"),
  isoCanvas: document.querySelector("#isoCanvas"),
  entityList: document.querySelector("#entityList"),
  counts: document.querySelector("#counts"),
  status: document.querySelector("#status"),
  undoEditor: document.querySelector("#undoEditor"),
  redoEditor: document.querySelector("#redoEditor"),
  resetEditor: document.querySelector("#resetEditor"),
  validateEditor: document.querySelector("#validateEditor"),
  exportPanel: document.querySelector("#exportPanel"),
  exportJson: document.querySelector("#exportJson"),
};

const params = new URLSearchParams(location.search);
const histories = new Map();
const draftWarnings = new Map();
const sourceImages = new Map();
const sourceMessages = new Map();

for (const layout of LAYOUTS) {
  const townHall = layout.buildings.find(({ id }) => id === "townHall-1");
  const calibration = createScreenshotCalibration(
    { x: 480, y: 280 },
    { x: 630, y: 380 },
    { x: 330, y: 380 },
    { x: townHall.x + townHall.width / 2, y: townHall.y + townHall.height / 2 },
  );
  const initial = createLayoutEditorState(layout, calibration);
  const serialized = readDraft(layout.id);
  const storageWarning = draftWarnings.get(layout.id);
  const restored = serialized
    ? parseLayoutEditorDraft(serialized, initial)
    : { state: initial, warning: null };
  // History.initial always remains the production proposal. A restored draft is
  // only the present state, so reset cannot accidentally restore the draft.
  histories.set(layout.id, {
    ...createLayoutEditorHistory(initial),
    present: restored.state,
  });
  draftWarnings.set(layout.id, restored.warning ?? storageWarning ?? null);
}

let selectedBaseId = LAYOUTS[0].id;
let selectedTool = "align";
let selectedEntity = null;
let preview = null;
let activePointerId = null;
let activePointerOwner = null;
let validationFeedback = null;

function currentHistory() {
  return histories.get(selectedBaseId);
}

function render() {
  const focusTarget = captureEditorFocus();
  const state = currentHistory().present;
  const geometry = createRaidIsoGeometry(960, 560, LAYOUT_EDITOR_GRID);
  renderToolbar(state);
  renderCounts(state, layoutEditorWallReserve(state));
  renderEntityList(state, selectedEntity);
  renderStatus(state);
  // Both renderers deliberately receive the exact same canonical state object.
  renderSourceCanvas(state, preview);
  renderIsoCanvas(state, preview, geometry);
  restoreEditorFocus(focusTarget);
}

function captureEditorFocus() {
  const active = document.activeElement;
  if (elements.baseTabs.contains(active)) return { group: "base", id: active.dataset.baseId };
  if (elements.toolButtons.contains(active)) return { group: "tool", id: active.dataset.tool };
  if (elements.entityList.contains(active)) {
    return { group: "entity", kind: active.dataset.entityKind, id: active.dataset.entityId };
  }
  return null;
}

function restoreEditorFocus(target) {
  if (!target) return;
  const container = {
    base: elements.baseTabs,
    tool: elements.toolButtons,
    entity: elements.entityList,
  }[target.group];
  const button = [...container.querySelectorAll("button")].find((candidate) => {
    if (target.group === "base") return candidate.dataset.baseId === target.id;
    if (target.group === "tool") return candidate.dataset.tool === target.id;
    return candidate.dataset.entityKind === target.kind && candidate.dataset.entityId === target.id;
  });
  button?.focus({ preventScroll: true });
}

function renderToolbar(state) {
  elements.baseTabs.replaceChildren(...LAYOUTS.map((layout) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = BASE_LABELS[layout.id];
    button.dataset.baseId = layout.id;
    button.setAttribute("aria-pressed", String(layout.id === selectedBaseId));
    button.addEventListener("click", () => selectBase(layout.id));
    return button;
  }));

  const reserve = layoutEditorWallReserve(state);
  elements.toolButtons.replaceChildren(...TOOLS.map((tool) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = tool.label;
    button.dataset.tool = tool.id;
    button.setAttribute("aria-pressed", String(tool.id === selectedTool));
    button.disabled = tool.id === "paint" && reserve === 0;
    button.addEventListener("click", () => {
      cancelPointerInteraction();
      selectedTool = tool.id;
      validationFeedback = null;
      invalidateExport();
      render();
    });
    return button;
  }));

  elements.undoEditor.disabled = currentHistory().past.length === 0;
  elements.redoEditor.disabled = currentHistory().future.length === 0;
}

function renderCounts(state, reserve) {
  elements.counts.textContent = [
    `${state.buildings.length} batiments`,
    `${state.walls.length} murs places`,
    `${reserve} murs en reserve`,
    `${state.traps.length} bombes`,
  ].join(" - ");
}

function renderEntityList(state, selection) {
  const groups = [
    ["building", state.buildings],
    ["wall", state.walls],
    ["trap", state.traps],
  ];
  elements.entityList.replaceChildren(...groups.map(([kind, entities]) => {
    const section = document.createElement("section");
    section.className = "entity-group";
    const heading = document.createElement("h3");
    heading.textContent = `${KIND_LABELS[kind]} (${entities.length})`;
    section.append(heading);
    for (const entity of entities) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.entityKind = kind;
      button.dataset.entityId = entity.id;
      button.setAttribute("aria-pressed", String(
        selection?.kind === kind && selection.id === entity.id,
      ));
      button.classList.toggle(
        "is-invalid",
        Boolean(validationFeedback?.highlights.errorIds.has(entity.id)),
      );
      button.classList.toggle(
        "is-warning",
        Boolean(validationFeedback?.highlights.warningIds.has(entity.id)),
      );
      const name = ENTITY_TYPE_LABELS[entity.type] ?? "Element";
      const label = document.createElement("span");
      label.textContent = name;
      const stableId = document.createElement("small");
      stableId.textContent = entity.id;
      button.append(label, stableId);
      button.addEventListener("click", () => {
        selectedEntity = { kind, id: entity.id };
        validationFeedback = null;
        render();
      });
      section.append(button);
    }
    return section;
  }));
}

function renderStatus() {
  const parts = [];
  const draftWarning = draftWarnings.get(selectedBaseId);
  const sourceMessage = sourceMessages.get(selectedBaseId);
  if (draftWarning) parts.push(`Avertissement de brouillon : ${draftWarning}.`);
  if (sourceMessage) parts.push(sourceMessage);
  if (validationFeedback) parts.push(validationFeedback.message);
  if (!parts.length) {
    parts.push("Brouillon local charge. Validez le village avant d'utiliser les coordonnees.");
  }
  elements.status.textContent = parts.join(" ");
  elements.status.classList.toggle("is-invalid", validationFeedback?.kind === "error");
  elements.status.classList.toggle(
    "is-warning",
    Boolean(draftWarning) || validationFeedback?.kind === "warning",
  );
}

function renderSourceCanvas(state, activePreview) {
  const canvas = elements.sourceCanvas;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#0b111a";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const record = sourceImages.get(state.baseId);
  let drawRect = { x: 0, y: 0, width: canvas.width, height: canvas.height };
  if (record?.image?.complete && record.image.naturalWidth > 0) {
    drawRect = containRect(
      record.image.naturalWidth,
      record.image.naturalHeight,
      canvas.width,
      canvas.height,
    );
    context.drawImage(record.image, drawRect.x, drawRect.y, drawRect.width, drawRect.height);
  } else {
    context.fillStyle = "#8492a6";
    context.font = "20px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText("Choisissez une capture locale pour cette vue", canvas.width / 2, 48);
  }
  if (record) record.drawRect = drawRect;

  drawSourceGrid(context, state.calibration, drawRect);
  drawSourceEntities(context, state, drawRect, activePreview);
  drawSourceValidationHighlights(context, state, drawRect);
}

function renderIsoCanvas(state, activePreview, geometry) {
  const canvas = elements.isoCanvas;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#111a23";
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawIsoGrid(context, geometry);
  for (const [kind, entities] of stateEntities(state)) {
    for (const entity of entities) {
      const normalized = normalizedEntity(entity);
      drawPolygon(
        context,
        projectRaidFootprint(geometry, normalized),
        entityFill(kind),
        entityStroke(kind, entity.id),
      );
    }
  }
  if (activePreview?.cell) {
    drawPolygon(
      context,
      projectRaidFootprint(geometry, { ...activePreview.cell, width: 1, height: 1 }),
      "rgba(94, 234, 212, .22)",
      "#5eead4",
    );
  }
  drawIsoValidationHighlights(context, geometry);
}

function drawSourceGrid(context, calibration, drawRect) {
  context.save();
  context.strokeStyle = "rgba(148, 163, 184, .22)";
  context.lineWidth = 1;
  for (let x = 0; x <= LAYOUT_EDITOR_GRID.width; x += 1) {
    drawSourceLine(context, calibration, drawRect, { x, y: 0 }, {
      x,
      y: LAYOUT_EDITOR_GRID.height,
    });
  }
  for (let y = 0; y <= LAYOUT_EDITOR_GRID.height; y += 1) {
    drawSourceLine(context, calibration, drawRect, { x: 0, y }, {
      x: LAYOUT_EDITOR_GRID.width,
      y,
    });
  }
  context.restore();
}

function drawSourceLine(context, calibration, drawRect, from, to) {
  const start = sourcePoint(calibration, drawRect, from);
  const end = sourcePoint(calibration, drawRect, to);
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();
}

function drawSourceEntities(context, state, drawRect, activePreview) {
  for (const [kind, entities] of stateEntities(state)) {
    for (const entity of entities) {
      const width = entity.width ?? 1;
      const height = entity.height ?? 1;
      const points = [
        { x: entity.x, y: entity.y },
        { x: entity.x + width, y: entity.y },
        { x: entity.x + width, y: entity.y + height },
        { x: entity.x, y: entity.y + height },
      ].map((point) => sourcePoint(state.calibration, drawRect, point));
      drawPolygon(context, points, entityFill(kind), entityStroke(kind, entity.id));
    }
  }
  if (activePreview?.cell) {
    const { x, y } = activePreview.cell;
    const points = [
      { x, y }, { x: x + 1, y }, { x: x + 1, y: y + 1 }, { x, y: y + 1 },
    ].map((point) => sourcePoint(state.calibration, drawRect, point));
    drawPolygon(context, points, "rgba(94, 234, 212, .22)", "#5eead4");
  }
}

function drawIsoGrid(context, geometry) {
  context.save();
  context.strokeStyle = "rgba(148, 163, 184, .2)";
  context.lineWidth = 1;
  for (let x = 0; x <= LAYOUT_EDITOR_GRID.width; x += 1) {
    const start = projectRaidPoint(geometry, { x, y: 0 });
    const end = projectRaidPoint(geometry, { x, y: LAYOUT_EDITOR_GRID.height });
    drawLine(context, start, end);
  }
  for (let y = 0; y <= LAYOUT_EDITOR_GRID.height; y += 1) {
    const start = projectRaidPoint(geometry, { x: 0, y });
    const end = projectRaidPoint(geometry, { x: LAYOUT_EDITOR_GRID.width, y });
    drawLine(context, start, end);
  }
  context.restore();
}

function drawLine(context, start, end) {
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();
}

function drawPolygon(context, points, fill, stroke) {
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) context.lineTo(point.x, point.y);
  context.closePath();
  context.fillStyle = fill;
  context.fill();
  context.strokeStyle = stroke;
  context.lineWidth = stroke === "#fb7185" ? 3 : 1.5;
  context.stroke();
}

function sourcePoint(calibration, drawRect, point) {
  const projected = projectEditorGridPoint(calibration, point);
  return {
    x: drawRect.x + projected.x / 960 * drawRect.width,
    y: drawRect.y + projected.y / 560 * drawRect.height,
  };
}

function stateEntities(state) {
  return [
    ["wall", state.walls],
    ["trap", state.traps],
    ["building", state.buildings],
  ];
}

function createValidationHighlights(state, result) {
  const errorIds = new Set();
  const errorCells = new Set();
  const warningIds = new Set();
  const warningCells = new Set();
  const buildingIds = new Set(state.buildings.map(({ id }) => id));
  const trapIds = new Set(state.traps.map(({ id }) => id));
  const missingBuildingIds = state.requiredBuildingIds.filter((id) => !buildingIds.has(id));
  const missingTrapIds = state.requiredTrapIds.filter((id) => !trapIds.has(id));
  const unexpectedBuildingIds = [...buildingIds].filter(
    (id) => !state.requiredBuildingIds.includes(id),
  );
  const unexpectedTrapIds = [...trapIds].filter((id) => !state.requiredTrapIds.includes(id));

  if (result.errors.some((message) => /22 batiments/i.test(message))) {
    addEntitiesToHighlights(state.buildings, errorIds, errorCells);
    for (const id of missingBuildingIds) errorIds.add(id);
  }
  if (result.errors.some((message) => /50 murs/i.test(message))) {
    addEntitiesToHighlights(state.walls, errorIds, errorCells);
  }
  if (result.errors.some((message) => /2 bombes/i.test(message))) {
    addEntitiesToHighlights(state.traps, errorIds, errorCells);
    for (const id of missingTrapIds) errorIds.add(id);
  }
  for (const id of [
    ...missingBuildingIds,
    ...missingTrapIds,
    ...unexpectedBuildingIds,
    ...unexpectedTrapIds,
  ]) errorIds.add(id);
  addEntitiesToHighlights(
    state.buildings.filter(({ id }) => unexpectedBuildingIds.includes(id)),
    errorIds,
    errorCells,
  );
  addEntitiesToHighlights(
    state.traps.filter(({ id }) => unexpectedTrapIds.includes(id)),
    errorIds,
    errorCells,
  );

  const occupied = new Map();
  const overlap = new Set();
  const offGrid = new Set();
  for (const [, entities] of stateEntities(state)) {
    for (const entity of entities) {
      for (const cell of entityFootprintCells(entity)) {
        const key = cellKey(cell);
        if (!insideEditorGrid(cell)) {
          offGrid.add(key);
          errorIds.add(entity.id);
          errorCells.add(key);
        }
        const previousId = occupied.get(key);
        if (previousId) {
          overlap.add(key);
          errorIds.add(previousId);
          errorIds.add(entity.id);
          errorCells.add(key);
        } else {
          occupied.set(key, entity.id);
        }
      }
    }
  }

  const components = wallComponents(state.walls).sort((left, right) => right.length - left.length);
  const disconnectedWallCells = result.warnings.some((message) => /deconnect/i.test(message))
    ? components.slice(1).flat()
    : [];
  for (const wall of disconnectedWallCells) {
    warningIds.add(wall.id);
    warningCells.add(cellKey(wall));
  }
  return {
    errorIds,
    errorCells,
    warningIds,
    warningCells,
    missingBuildingIds,
    missingTrapIds,
    overlap,
    offGrid,
    disconnectedWallCells,
  };
}

function addEntitiesToHighlights(entities, ids, cells) {
  for (const entity of entities) {
    ids.add(entity.id);
    for (const cell of entityFootprintCells(entity)) cells.add(cellKey(cell));
  }
}

function entityFootprintCells(entity) {
  const width = entity.width ?? 1;
  const height = entity.height ?? 1;
  return Array.from({ length: width * height }, (_, index) => ({
    x: entity.x + index % width,
    y: entity.y + Math.floor(index / width),
  }));
}

function insideEditorGrid({ x, y }) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 &&
    x < LAYOUT_EDITOR_GRID.width && y < LAYOUT_EDITOR_GRID.height;
}

function cellKey({ x, y }) {
  return `${x},${y}`;
}

function parseCellKey(key) {
  const [x, y] = key.split(",").map(Number);
  return { x, y };
}

function wallComponents(walls) {
  const byCell = new Map(walls.map((wall) => [cellKey(wall), wall]));
  const remaining = new Set(byCell.keys());
  const components = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    const queue = [first];
    const component = [];
    remaining.delete(first);
    while (queue.length) {
      const key = queue.shift();
      const wall = byCell.get(key);
      component.push(wall);
      for (const neighbor of [
        { x: wall.x + 1, y: wall.y },
        { x: wall.x - 1, y: wall.y },
        { x: wall.x, y: wall.y + 1 },
        { x: wall.x, y: wall.y - 1 },
      ].map(cellKey)) {
        if (remaining.delete(neighbor)) queue.push(neighbor);
      }
    }
    components.push(component);
  }
  return components;
}

function normalizedEntity(entity) {
  return { ...entity, width: entity.width ?? 1, height: entity.height ?? 1 };
}

function entityFill(kind) {
  if (kind === "wall") return "rgba(148, 163, 184, .72)";
  if (kind === "trap") return "rgba(251, 191, 36, .7)";
  return "rgba(45, 212, 191, .5)";
}

function entityStroke(kind, id) {
  if (validationFeedback?.highlights.errorIds.has(id)) return "#fb7185";
  if (validationFeedback?.highlights.warningIds.has(id)) return "#facc15";
  if (selectedEntity?.kind === kind && selectedEntity.id === id) return "#facc15";
  return kind === "building" ? "#99f6e4" : "#e2e8f0";
}

function drawSourceValidationHighlights(context, state, drawRect) {
  const highlights = validationFeedback ? validationFeedback.highlights : null;
  if (!highlights) return;
  const projectCell = ({ x, y }) => [
    { x, y }, { x: x + 1, y }, { x: x + 1, y: y + 1 }, { x, y: y + 1 },
  ].map((point) => sourcePoint(state.calibration, drawRect, point));
  drawCellHighlights(context, highlights.warningCells, projectCell, "#facc15");
  drawCellHighlights(context, highlights.errorCells, projectCell, "#fb7185");
}

function drawIsoValidationHighlights(context, geometry) {
  const highlights = validationFeedback ? validationFeedback.highlights : null;
  if (!highlights) return;
  const projectCell = (cell) => projectRaidFootprint(
    geometry,
    { ...cell, width: 1, height: 1 },
  );
  drawCellHighlights(context, highlights.warningCells, projectCell, "#facc15");
  drawCellHighlights(context, highlights.errorCells, projectCell, "#fb7185");
}

function drawCellHighlights(context, cells, projectCell, color) {
  for (const key of cells) {
    drawPolygon(context, projectCell(parseCellKey(key)), "rgba(0, 0, 0, 0)", color);
  }
}

function containRect(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    x: (targetWidth - width) / 2,
    y: (targetHeight - height) / 2,
    width,
    height,
  };
}

function selectBase(baseId) {
  if (baseId === selectedBaseId) return;
  cancelPointerInteraction();
  selectedBaseId = baseId;
  selectedEntity = null;
  validationFeedback = null;
  elements.sourceImage.value = "";
  invalidateExport();
  render();
}

function persistCurrentDraft() {
  try {
    localStorage.setItem(
      layoutEditorDraftKey(selectedBaseId),
      serializeLayoutEditorDraft(currentHistory().present),
    );
  } catch {
    sourceMessages.set(selectedBaseId, "Le brouillon ne peut pas etre enregistre localement.");
  }
}

function readDraft(baseId) {
  try {
    return localStorage.getItem(layoutEditorDraftKey(baseId));
  } catch {
    draftWarnings.set(baseId, "Stockage local indisponible");
    return null;
  }
}

function replaceCurrentHistory(nextHistory) {
  histories.set(selectedBaseId, nextHistory);
  validationFeedback = null;
  invalidateExport();
  persistCurrentDraft();
  render();
}

function invalidateExport() {
  elements.exportPanel.hidden = true;
  elements.exportJson.value = "";
}

elements.undoEditor.addEventListener("click", () => {
  replaceCurrentHistory(undoLayoutEditorHistory(currentHistory()));
});

elements.redoEditor.addEventListener("click", () => {
  replaceCurrentHistory(redoLayoutEditorHistory(currentHistory()));
});

elements.resetEditor.addEventListener("click", () => {
  const accepted = confirm(
    "Revenir a la proposition de production de ce village ? Le brouillon courant sera remplace.",
  );
  if (!accepted) return;
  replaceCurrentHistory(resetLayoutEditorHistory(currentHistory()));
});

elements.validateEditor.addEventListener("click", () => {
  const state = currentHistory().present;
  const result = validateLayoutEditorState(state);
  const highlights = createValidationHighlights(state, result);
  if (!result.valid) {
    validationFeedback = {
      kind: "error",
      highlights,
      message: `Validation bloquee : ${result.errors.join(" ; ")}. ${highlightSummary(highlights)}`,
    };
    invalidateExport();
    render();
    return;
  }
  elements.exportJson.value = serializeLayoutEditorExport(state);
  elements.exportPanel.hidden = false;
  validationFeedback = {
    kind: result.warnings.length ? "warning" : "success",
    highlights,
    message: result.warnings.length
      ? `Village valide avec avertissement : ${result.warnings.join(" ; ")}. ${highlightSummary(highlights)}`
      : "Village valide. Les coordonnees affichees correspondent aux deux vues.",
  };
  render();
});

function highlightSummary(highlights) {
  const ids = [...new Set([...highlights.errorIds, ...highlights.warningIds])];
  const cells = [...new Set([...highlights.errorCells, ...highlights.warningCells])];
  const summarize = (values) => {
    const visible = values.slice(0, 8).join(", ");
    return values.length > 8 ? `${visible} (+${values.length - 8})` : visible;
  };
  const parts = [];
  if (ids.length) parts.push(`IDs : ${summarize(ids)}`);
  if (cells.length) parts.push(`cases : ${summarize(cells)}`);
  return parts.length ? `A verifier - ${parts.join(" ; ")}.` : "";
}

elements.sourceImage.addEventListener("change", () => {
  const [file] = elements.sourceImage.files;
  if (!file) return;
  const objectUrl = URL.createObjectURL(file);
  loadSourceImage(selectedBaseId, objectUrl, true);
});

function loadSourceImage(baseId, source, isObjectUrl = false) {
  if (!isObjectUrl) {
    const url = new URL(source, location.href);
    if (url.origin !== location.origin) {
      sourceMessages.set(baseId, "Source refusee : l'URL doit utiliser la meme origine.");
      if (baseId === selectedBaseId) render();
      return;
    }
    source = url.href;
  }

  revokeSourceImage(baseId);
  const image = new Image();
  const record = { image, url: source, isObjectUrl, drawRect: null };
  sourceImages.set(baseId, record);
  sourceMessages.set(
    baseId,
    isObjectUrl
      ? "Image locale temporaire chargee pour ce village."
      : "Image de developpement same-origin chargee pour ce village.",
  );
  image.addEventListener("load", () => {
    if (sourceImages.get(baseId) !== record) return;
    if (baseId === selectedBaseId) render();
  }, { once: true });
  image.addEventListener("error", () => {
    if (sourceImages.get(baseId) !== record) return;
    sourceMessages.set(baseId, "Impossible de charger l'image choisie.");
    revokeSourceImage(baseId);
    if (baseId === selectedBaseId) render();
  }, { once: true });
  image.src = source;
}

function revokeSourceImage(baseId) {
  const previous = sourceImages.get(baseId);
  if (previous?.isObjectUrl) URL.revokeObjectURL(previous.url);
  sourceImages.delete(baseId);
}

function pointerPosition(event, canvas) {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - bounds.left) * canvas.width / bounds.width,
    y: (event.clientY - bounds.top) * canvas.height / bounds.height,
  };
}

function previewCellFromEvent(event) {
  const canvas = event.currentTarget;
  const point = pointerPosition(event, canvas);
  if (canvas === elements.isoCanvas) {
    return unprojectRaidPoint(createRaidIsoGeometry(960, 560, LAYOUT_EDITOR_GRID), point);
  }
  const record = sourceImages.get(selectedBaseId);
  const drawRect = record?.drawRect ?? { x: 0, y: 0, width: 960, height: 560 };
  const screenshotPoint = {
    x: (point.x - drawRect.x) / drawRect.width * 960,
    y: (point.y - drawRect.y) / drawRect.height * 560,
  };
  return unprojectEditorScreenshotPoint(currentHistory().present.calibration, screenshotPoint);
}

function beginPointerPreview(event) {
  if (activePointerId !== null) return;
  activePointerId = event.pointerId;
  activePointerOwner = event.currentTarget;
  activePointerOwner.setPointerCapture(event.pointerId);
  preview = { cell: previewCellFromEvent(event) };
  render();
}

function updatePointerPreview(event) {
  if (event.pointerId !== activePointerId) return;
  preview = { cell: previewCellFromEvent(event) };
  render();
}

function endPointerPreview(event) {
  if (event.pointerId !== activePointerId) return;
  cancelPointerInteraction();
  render();
}

function cancelPointerInteraction() {
  const ownsPointer = activePointerOwner !== null && activePointerId !== null &&
    activePointerOwner.hasPointerCapture(activePointerId);
  if (ownsPointer) activePointerOwner.releasePointerCapture(activePointerId);
  activePointerId = null;
  activePointerOwner = null;
  preview = null;
}

for (const canvas of [elements.sourceCanvas, elements.isoCanvas]) {
  canvas.addEventListener("pointerdown", beginPointerPreview);
  canvas.addEventListener("pointermove", updatePointerPreview);
  canvas.addEventListener("pointerup", endPointerPreview);
  canvas.addEventListener("pointercancel", endPointerPreview);
  canvas.addEventListener("lostpointercapture", endPointerPreview);
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    cancelPointerInteraction();
    render();
  }
});

window.addEventListener("beforeunload", () => {
  for (const baseId of sourceImages.keys()) revokeSourceImage(baseId);
});

for (const [baseId, key] of Object.entries(SOURCE_KEYS)) {
  const source = params.get(key);
  if (source) loadSourceImage(baseId, source);
}
render();
