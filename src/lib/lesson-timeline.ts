// A lesson's timeline (SLJ-35): a bar at the top of the lesson that moves
// through time as the student reads. Its points are `timeline` blocks the
// teacher puts into the lesson, each marking where in the text the lesson
// reaches that moment: a label, a year (negative before the common era), an
// optional end year (a war, a reign), how the date is written when a year
// alone isn't it ("14th century", "around 1200"), a caption and a small
// picture from the course's own files, or, without one, an icon from a fixed
// set (a battle, a ruler, …).
//
// Stored as one line of JSON after the block's marker (see "Lesson block
// markers" in docs/contracts.md):
//   [matko-block]: <> (timeline)
//   {"label":"Kosovska bitka","year":1389,"image":"knez-lazar-3fa1c2d9.png"}

// The icons a point without a picture can have, drawn by the app.
export const TIMELINE_ICONS = [
  "emperor",
  "king",
  "prince",
  "person",
  "battle",
  "fortress",
  "church",
  "document",
  "state",
  "migration",
] as const;
export type TimelineIcon = (typeof TIMELINE_ICONS)[number];

export type TimelineMarker = {
  caption?: string;
  // Shown instead of the year, e.g. "14. vek", "oko 1200".
  dateText?: string;
  endYear?: number;
  // Shown when there's no picture (one this version doesn't know is dropped).
  icon?: TimelineIcon;
  // A course asset's filename.
  image?: string;
  imageAlt?: string;
  label: string;
  // Placement on the bar; negative before the common era (490 BC = -490).
  year?: number;
};

const TEXT_FIELDS = ["caption", "dateText", "image", "imageAlt", "label"] as const;
const YEAR_FIELDS = ["endYear", "year"] as const;

const isYear = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && Math.abs(value) <= 1_000_000;

// The marker in a block's body, or null when it isn't one (a newer version's
// fields are dropped; the block is kept as unknown only when it can't be read).
export function parseTimelineMarker(source: string): TimelineMarker | null {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.label !== "string") return null;

  const marker: TimelineMarker = { label: record.label };
  for (const field of TEXT_FIELDS) {
    if (field !== "label" && typeof record[field] === "string" && record[field] !== "") marker[field] = record[field];
  }
  for (const field of YEAR_FIELDS) {
    if (isYear(record[field])) marker[field] = record[field];
  }
  if ((TIMELINE_ICONS as readonly unknown[]).includes(record.icon)) marker.icon = record.icon as TimelineIcon;
  return marker;
}

// Keys in a fixed order, empty fields left out, so saving an unchanged
// marker writes the same line.
export function serializeTimelineMarker(marker: TimelineMarker): string {
  const ordered: Record<string, string | number> = { label: marker.label };
  if (isYear(marker.year)) ordered.year = marker.year;
  if (isYear(marker.endYear)) ordered.endYear = marker.endYear;
  for (const field of ["dateText", "caption", "image", "imageAlt", "icon"] as const) {
    if (marker[field]) ordered[field] = marker[field];
  }
  return JSON.stringify(ordered);
}

// The bar is laid out in pixels for the room it has (`viewport`). Close
// events get room by stretching it: wider than the window, it slides as the
// student reads. Points that would still touch go up a row.

// Points and ticks keep this far from the bar's ends, so an edge picture isn't cut.
const EDGE = 28;
// Room a point needs from the next one in its row (a picture is 40px).
export const POINT_GAP = 46;
// How far the bar may stretch to separate close events.
const MAX_PX_PER_YEAR = 20;
// Ticks (short lines) at least this far apart; every LABEL_EVERY-th one has
// its year, and the scale starts and ends on one of those.
const MIN_TICK_GAP = 14;
const LABEL_EVERY = 5;
// At most this many rows of points.
const MAX_ROWS = 3;

// Steps whose labelled ticks (every fifth) land on round years: 5, 10, 50, 100, …
const TICK_STEPS = [1, 2, 10, 20, 100, 200, 1000, 2000, 10_000];

export type TimelineLayout = {
  // Whether points sit by their dates (all have a year) or just in order.
  dated: boolean;
  // Each marker's place on the bar in pixels, its range's end, and its row
  // (0 next to the track, higher rows above).
  points: { end: number | null; row: number; x: number }[];
  rows: number;
  // Every tick, and whether it has its year written under it.
  ticks: { label: boolean; x: number; year: number }[];
  // The whole bar's width; wider than `viewport` when it scrolls.
  width: number;
};

export function layoutTimeline(markers: TimelineMarker[], viewport: number): TimelineLayout {
  const room = Math.max(viewport - 2 * EDGE, 1);
  const dated = markers.length > 0 && markers.every((marker) => isYear(marker.year));

  if (!dated) {
    const width = Math.max(viewport, 2 * EDGE + (markers.length - 1) * POINT_GAP * 1.5);
    const last = Math.max(1, markers.length - 1);
    const points = markers.map((_, index) => ({
      end: null,
      row: 0,
      x: markers.length === 1 ? width / 2 : EDGE + ((width - 2 * EDGE) * index) / last,
    }));
    return { dated: false, points, rows: 1, ticks: [], width };
  }

  const starts = markers.map((marker) => marker.year as number);
  const years = markers.flatMap((marker) => [marker.year as number, ...(isYear(marker.endYear) ? [marker.endYear] : [])]);
  const earliest = Math.min(...years);
  const latest = Math.max(...years);
  const spanYears = Math.max(latest - earliest, 1);

  // Stretch until the closest two different years are a point apart, as far
  // as MAX_PX_PER_YEAR allows; never narrower than the window.
  const sorted = [...new Set(starts)].sort((a, b) => a - b);
  const closest = sorted.slice(1).reduce((gap, year, index) => Math.min(gap, year - sorted[index]), Infinity);
  const wanted = Number.isFinite(closest) ? Math.min(POINT_GAP / closest, MAX_PX_PER_YEAR) : 0;
  const pxPerYear = Math.max(wanted, room / spanYears);

  // The scale starts and ends on the nearest labelled ticks outside the events.
  const step = TICK_STEPS.find((candidate) => candidate * pxPerYear >= MIN_TICK_GAP) ?? TICK_STEPS[TICK_STEPS.length - 1];
  const labelStep = step * LABEL_EVERY;
  const first = Math.floor(earliest / labelStep) * labelStep;
  const last = Math.max(Math.ceil(latest / labelStep) * labelStep, first + labelStep);
  const scale = Math.max(wanted, room / (last - first));
  const at = (year: number) => EDGE + (year - first) * scale;
  const ticks: TimelineLayout["ticks"] = [];
  if (latest > earliest) {
    for (let year = first, index = 0; year <= last; year += step, index += 1) {
      ticks.push({ label: index % LABEL_EVERY === 0, x: at(year), year });
    }
  }

  // Rows: each point goes in the lowest row where it clears that row's last point.
  const rowEnds: number[] = [];
  const points = markers.map((marker) => {
    const x = at(marker.year as number);
    let row = rowEnds.findIndex((end) => x - end >= POINT_GAP);
    if (row === -1) row = rowEnds.length < MAX_ROWS ? rowEnds.length : rowEnds.indexOf(Math.min(...rowEnds));
    rowEnds[row] = x;
    return {
      end: isYear(marker.endYear) && marker.endYear > (marker.year as number) ? at(marker.endYear) : null,
      row,
      x,
    };
  });

  return { dated: true, points, rows: Math.max(1, rowEnds.length), ticks, width: at(last) + EDGE };
}

// Which points' years fit under them without running into a neighbour's in
// the same row: the current point's always (with its name, so it needs
// `activeRoom` on each side), then from left to right each one at least
// POINT_GAP from every year already shown.
export function visiblePointYears(points: TimelineLayout["points"], active: number, activeRoom = 70): boolean[] {
  const shown = points.map((_, index) => index === active);
  const room = (index: number) => (index === active ? activeRoom : POINT_GAP / 2);
  const clear = (index: number) =>
    shown.every(
      (isShown, other) =>
        !isShown ||
        other === index ||
        points[other].row !== points[index].row ||
        Math.abs(points[other].x - points[index].x) >= room(other) + room(index),
    );
  points.forEach((_, index) => {
    if (!shown[index] && clear(index)) shown[index] = true;
  });
  return shown;
}

// Where the bar's "now" is, in pixels, for a reading position: `progress` is
// the marker index the reader is at, with the fraction of the way to the
// next one (1.5 = halfway between the second and third). Before the first
// marker it's the first point; past the last, the last.
export function timelinePosition(layout: TimelineLayout, progress: number): number {
  const { points } = layout;
  if (points.length === 0) return 0;
  const clamped = Math.min(Math.max(progress, 0), points.length - 1);
  const index = Math.floor(clamped);
  const next = points[Math.min(index + 1, points.length - 1)];
  return points[index].x + (next.x - points[index].x) * (clamped - index);
}

// How far the bar slides so "now" sits a third of the way into the window,
// never past either end, and never so far that the current point (`activeX`,
// with its name beside it) leaves the window on the left.
export function timelineOffset(layout: TimelineLayout, now: number, viewport: number, activeX?: number): number {
  const wanted = activeX === undefined ? now - viewport / 3 : Math.min(now - viewport / 3, activeX - ACTIVE_ROOM);
  return Math.min(Math.max(wanted, 0), Math.max(layout.width - viewport, 0));
}

// Room kept left of the current point for its year and name.
const ACTIVE_ROOM = 140;

// Where the reader is: a line READING_LINE of the way down the text under
// the bar (`top` to `bottom`, from the top of the window). In the last
// screen of the lesson (`remaining`: how much more the page can scroll) the
// line moves down to the bottom, so the last points are passed one by one
// rather than all at once when the page stops.
const READING_LINE = 0.4;

export function readingLine({ bottom, remaining, top }: { bottom: number; remaining: number; top: number }): number {
  return Math.max(top + (bottom - top) * READING_LINE, bottom - remaining);
}

// The reading progress from where the markers are on screen: `tops` are
// their distances from the top of the window, in document order, and `line`
// is the reading line's (`readingLine`). -1 before the first marker.
export function readingProgress(tops: number[], line: number): number {
  if (tops.length === 0) return -1;
  if (line < tops[0]) return -1;
  for (let index = tops.length - 1; index >= 0; index -= 1) {
    if (tops[index] <= line) {
      const next = tops[index + 1];
      if (next === undefined || next <= tops[index]) return index;
      return index + Math.min(1, (line - tops[index]) / (next - tops[index]));
    }
  }
  return -1;
}

// How a year is written: as it is in the common era, through `bce` before it
// (490 BC is year -490; `bce` gets 490 and words it in the student's language).
export function timelineYearText(year: number, bce: (year: number) => string): string {
  return year < 0 ? bce(-year) : String(year);
}

// A marker's date as shown: its own wording when it has one ("14. vek"),
// else its year, or its years for a range ("1914–1918").
export function timelineDateText(marker: TimelineMarker, bce: (year: number) => string): string {
  if (marker.dateText) return marker.dateText;
  if (!isYear(marker.year)) return "";
  const start = timelineYearText(marker.year, bce);
  return isYear(marker.endYear) && marker.endYear > marker.year ? `${start}–${timelineYearText(marker.endYear, bce)}` : start;
}
