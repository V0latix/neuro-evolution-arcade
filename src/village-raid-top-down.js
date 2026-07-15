const DEFAULT_MARGIN = Object.freeze({ x: 48, y: 24 });

export function createRaidTopDownGeometry(canvasWidth, canvasHeight, grid, options = {}) {
  const marginX = options.marginX ?? DEFAULT_MARGIN.x;
  const marginY = options.marginY ?? DEFAULT_MARGIN.y;
  const tile = Math.floor(Math.min(
    (canvasWidth - marginX * 2) / grid.width,
    (canvasHeight - marginY * 2) / grid.height,
  ));
  if (!Number.isFinite(tile) || tile <= 0) {
    throw new RangeError("Grid does not fit canvas");
  }
  const width = grid.width * tile;
  const height = grid.height * tile;
  const left = (canvasWidth - width) / 2;
  const top = (canvasHeight - height) / 2;
  return Object.freeze({
    canvasWidth,
    canvasHeight,
    grid,
    tile,
    bounds: Object.freeze({
      left,
      top,
      right: left + width,
      bottom: top + height,
    }),
  });
}

export function projectRaidTopDownPoint(geometry, point) {
  return {
    x: geometry.bounds.left + point.x * geometry.tile,
    y: geometry.bounds.top + point.y * geometry.tile,
  };
}

export function projectRaidTopDownFootprint(geometry, entity) {
  const point = projectRaidTopDownPoint(geometry, entity);
  return {
    x: point.x,
    y: point.y,
    width: (entity.width ?? 1) * geometry.tile,
    height: (entity.height ?? 1) * geometry.tile,
  };
}

export function unprojectRaidTopDownPoint(geometry, point) {
  const { left, top, right, bottom } = geometry.bounds;
  if (point.x < left || point.x > right || point.y < top || point.y > bottom) {
    return null;
  }
  return {
    x: (point.x - left) / geometry.tile,
    y: (point.y - top) / geometry.tile,
  };
}
