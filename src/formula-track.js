export const TRACK_WIDTH = 64;
export const CHICANE_TRACK_WIDTH = 48;
export const CHICANE_SECTIONS = [
  "Variante del Rettifilo",
  "Variante della Roggia",
  "Variante Ascari",
];
export const MONZA_SECTION_ORDER = [
  "Rettifilo",
  "Variante del Rettifilo",
  "Curva Grande",
  "Variante della Roggia",
  "Lesmo 1",
  "Lesmo 2",
  "Serraglio",
  "Variante Ascari",
  "Opposite straight",
  "Curva Alboreto",
  "Start finish",
];

// Normalized arcade centreline digitized from the current Monza GP layout and
// rotated 90 degrees counterclockwise so the start straight runs along the
// bottom of the simulation. It is an original data representation, not an
// imported circuit asset. Reference: FIA circuit map and the MIT-licensed
// bacinger/f1-circuits Monza GeoJSON.
export const MONZA_NORMALIZED_SECTIONS = [
  { name: "Rettifilo", points: [[0.635, 0.967], [0.437, 0.938], [0.355, 0.925]] },
  {
    name: "Variante del Rettifilo",
    points: [
      [0.351, 0.924], [0.349, 0.920], [0.349, 0.915], [0.349, 0.908], [0.349, 0.903], [0.349, 0.897],
      [0.347, 0.893], [0.345, 0.890], [0.343, 0.890], [0.341, 0.890], [0.295, 0.910],
    ],
  },
  {
    name: "Curva Grande",
    points: [
      [0.283, 0.913], [0.272, 0.914], [0.260, 0.913], [0.201, 0.905], [0.191, 0.902], [0.182, 0.899],
      [0.173, 0.893], [0.162, 0.886], [0.152, 0.877], [0.141, 0.865], [0.131, 0.852], [0.121, 0.835],
      [0.111, 0.816], [0.102, 0.795], [0.095, 0.773], [0.088, 0.748], [0.083, 0.722], [0.078, 0.694],
      [0.075, 0.663], [0.073, 0.631], [0.067, 0.505], [0.062, 0.351],
    ],
  },
  {
    name: "Variante della Roggia",
    points: [[0.061, 0.342], [0.060, 0.337], [0.057, 0.333], [0.047, 0.328], [0.044, 0.326], [0.042, 0.322], [0.041, 0.316], [0.039, 0.295], [0.036, 0.273]],
  },
  {
    name: "Lesmo 1",
    points: [[0.030, 0.240], [0.002, 0.096], [0.000, 0.084], [0.000, 0.072], [0.001, 0.061], [0.003, 0.053], [0.006, 0.045], [0.009, 0.038], [0.015, 0.029], [0.019, 0.023], [0.025, 0.020], [0.031, 0.018], [0.071, 0.012]],
  },
  {
    name: "Lesmo 2",
    points: [[0.138, 0.000], [0.144, 0.000], [0.148, 0.002], [0.152, 0.005], [0.154, 0.010], [0.157, 0.019], [0.187, 0.113], [0.212, 0.189]],
  },
  {
    name: "Serraglio",
    points: [[0.227, 0.237], [0.235, 0.260], [0.245, 0.286], [0.254, 0.305], [0.262, 0.321], [0.303, 0.404], [0.334, 0.464], [0.398, 0.589], [0.437, 0.664]],
  },
  {
    name: "Variante Ascari",
    points: [[0.443, 0.675], [0.447, 0.679], [0.450, 0.679], [0.455, 0.679], [0.465, 0.677], [0.471, 0.676], [0.479, 0.676], [0.483, 0.677], [0.489, 0.680], [0.495, 0.685], [0.502, 0.692], [0.508, 0.702], [0.514, 0.713], [0.518, 0.722], [0.521, 0.727], [0.526, 0.731], [0.534, 0.734], [0.570, 0.742]],
  },
  { name: "Opposite straight", points: [[0.609, 0.750], [0.958, 0.812]] },
  {
    name: "Curva Alboreto",
    points: [[0.970, 0.815], [0.976, 0.817], [0.982, 0.822], [0.987, 0.829], [0.992, 0.837], [0.996, 0.849], [0.999, 0.861], [1.000, 0.875], [0.999, 0.888], [0.998, 0.899], [0.995, 0.912], [0.992, 0.925], [0.988, 0.934], [0.983, 0.946], [0.975, 0.959], [0.968, 0.967], [0.960, 0.975], [0.951, 0.982], [0.941, 0.988], [0.930, 0.993]],
  },
  {
    name: "Start finish",
    points: [[0.921, 0.995], [0.908, 0.997], [0.894, 0.998], [0.881, 0.998], [0.856, 0.999], [0.834, 1.000], [0.810, 0.999], [0.778, 0.994], [0.678, 0.977]],
  },
];

function scaledPoint([x, y], section, width, worldWidth, worldHeight, paddingX, paddingY) {
  return {
    x: paddingX + x * (worldWidth - paddingX * 2),
    y: paddingY + y * (worldHeight - paddingY * 2),
    section,
    width,
  };
}

function makeSegments(centerline) {
  let start = 0;
  return centerline.map((from, index) => {
    const to = centerline[(index + 1) % centerline.length];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    const segment = {
      from,
      to,
      dx,
      dy,
      length,
      angle: Math.atan2(dy, dx),
      start,
      width: from.width,
      section: from.section,
    };
    start += length;
    return segment;
  });
}

function closestSegment(segments, x, y) {
  let closest = null;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const span = segment.length || 1;
    const rawT = ((x - segment.from.x) * segment.dx + (y - segment.from.y) * segment.dy) / (span * span);
    const t = Math.max(0, Math.min(1, rawT));
    const pointX = segment.from.x + segment.dx * t;
    const pointY = segment.from.y + segment.dy * t;
    const distance = Math.hypot(x - pointX, y - pointY);
    if (!closest || distance < closest.distance) {
      closest = {
        ...segment,
        index,
        t,
        x: pointX,
        y: pointY,
        distance,
        progress: segment.start + segment.length * t,
      };
    }
  }
  return closest;
}

function checkpointGeometry(point, previous, next, width, overhang) {
  const angle = Math.atan2(next.y - previous.y, next.x - previous.x);
  const lineHalfWidth = width / 2 + overhang;
  const lateralX = -Math.sin(angle);
  const lateralY = Math.cos(angle);
  return {
    angle,
    lateralX,
    lateralY,
    lineHalfWidth,
    startX: point.x - lateralX * lineHalfWidth,
    startY: point.y - lateralY * lineHalfWidth,
    endX: point.x + lateralX * lineHalfWidth,
    endY: point.y + lateralY * lineHalfWidth,
  };
}

function signedScreenArea(points) {
  return points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length];
    return area + point.x * next.y - next.x * point.y;
  }, 0) / 2;
}

export function createFormulaTrack({ worldWidth = 3600, worldHeight = 2450, paddingX = 300, paddingY = 200, checkpointOverhang = 24 } = {}) {
  const sections = [];
  const centerline = [];

  for (const definition of MONZA_NORMALIZED_SECTIONS) {
    const width = CHICANE_SECTIONS.includes(definition.name) ? CHICANE_TRACK_WIDTH : TRACK_WIDTH;
    const sectionCenterline = definition.points.map((point) => scaledPoint(
      point,
      definition.name,
      width,
      worldWidth,
      worldHeight,
      paddingX,
      paddingY,
    ));
    const startIndex = centerline.length;
    centerline.push(...sectionCenterline);
    sections.push({
      name: definition.name,
      width,
      centerline: sectionCenterline,
      startIndex,
      endIndex: centerline.length - 1,
    });
  }

  const segments = makeSegments(centerline);
  const checkpoints = [];
  for (const section of sections) {
    const checkpointDefinitions = CHICANE_SECTIONS.includes(section.name)
      ? [
          { phase: "entry", pointIndex: section.startIndex + 1 },
          { phase: "exit", pointIndex: section.endIndex },
        ]
      : [{ phase: "apex", pointIndex: section.startIndex + Math.floor(section.centerline.length / 2) }];

    for (const definition of checkpointDefinitions) {
      const point = centerline[definition.pointIndex];
      const previous = centerline[(definition.pointIndex - 1 + centerline.length) % centerline.length];
      const next = centerline[(definition.pointIndex + 1) % centerline.length];
      const geometry = checkpointGeometry(point, previous, next, section.width, checkpointOverhang);
      const closest = closestSegment(segments, point.x, point.y);
      checkpoints.push({
        x: point.x,
        y: point.y,
        section: section.name,
        phase: definition.phase,
        order: checkpoints.length,
        width: closest.width,
        progress: closest.progress,
        geometry,
      });
    }
  }

  return {
    direction: "clockwise",
    centerline,
    segments,
    sections,
    checkpoints,
    trackLength: segments.reduce((length, segment) => length + segment.length, 0),
    signedScreenArea: signedScreenArea(centerline),
    getWidthAtClosestSegment(x, y) {
      return closestSegment(segments, x, y);
    },
  };
}
