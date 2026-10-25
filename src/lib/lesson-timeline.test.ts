import { describe, expect, it } from "vitest";

import {
  layoutTimeline,
  parseTimelineMarker,
  readingLine,
  readingProgress,
  serializeTimelineMarker,
  timelineDateText,
  timelineOffset,
  timelinePosition,
  type TimelineMarker,
  visiblePointYears,
} from "@/lib/lesson-timeline";

describe("timeline markers", () => {
  it("round-trips a marker, keys in a fixed order and empty fields left out", () => {
    const line = serializeTimelineMarker({ caption: "", image: "lazar.png", label: "Kosovska bitka", year: 1389 });
    expect(line).toBe('{"label":"Kosovska bitka","year":1389,"image":"lazar.png"}');
    expect(parseTimelineMarker(line)).toEqual({ image: "lazar.png", label: "Kosovska bitka", year: 1389 });
  });

  it("keeps an icon it knows, and drops one it doesn't", () => {
    expect(parseTimelineMarker('{"label":"Marica","year":1371,"icon":"battle"}')).toEqual({ icon: "battle", label: "Marica", year: 1371 });
    expect(parseTimelineMarker('{"label":"A","icon":"dragon"}')).toEqual({ label: "A" });
    expect(serializeTimelineMarker({ icon: "battle", label: "Marica", year: 1371 })).toBe('{"label":"Marica","year":1371,"icon":"battle"}');
  });

  it("keeps years before the common era and ranges", () => {
    expect(parseTimelineMarker('{"label":"Marathon","year":-490}')).toEqual({ label: "Marathon", year: -490 });
    expect(parseTimelineMarker('{"label":"WWI","year":1914,"endYear":1918}')).toMatchObject({ endYear: 1918 });
  });

  it("reads what it can and refuses what isn't a marker", () => {
    expect(parseTimelineMarker('{"label":"A","year":"1389","newField":1}')).toEqual({ label: "A" });
    expect(parseTimelineMarker("not json")).toBeNull();
    expect(parseTimelineMarker('{"year":1389}')).toBeNull();
    expect(parseTimelineMarker("[]")).toBeNull();
  });
});

describe("layoutTimeline", () => {
  const at = (layout: ReturnType<typeof layoutTimeline>, index: number) => layout.points[index].x;

  it("fits a lesson whose events are far apart into the window, tick to tick", () => {
    const layout = layoutTimeline([{ label: "A", year: 1166 }, { label: "B", year: 1371 }], 1000);
    expect(layout.width).toBe(1000);
    // A line every 10 years, the year under every fifth, from 1150 to 1400.
    expect(layout.ticks[1].year - layout.ticks[0].year).toBe(10);
    expect(layout.ticks.filter((tick) => tick.label).map((tick) => tick.year)).toEqual([1150, 1200, 1250, 1300, 1350, 1400]);
    expect(layout.points.every((point) => point.row === 0)).toBe(true);
  });

  it("labels every fifth tick, on round years", () => {
    // Vlastimirovići, 630–950, on a narrow window: a line every 20 years.
    const layout = layoutTimeline([{ label: "A", year: 630 }, { label: "B", year: 950 }], 300);
    expect(layout.ticks[1].year - layout.ticks[0].year).toBe(20);
    expect(layout.ticks.filter((tick) => tick.label).map((tick) => tick.year)).toEqual([600, 700, 800, 900, 1000]);
  });

  it("stretches the bar so close events get room, with finer ticks", () => {
    // Duklja: 1040, 1042 and 1046 are years apart.
    const layout = layoutTimeline(
      [
        ...[1000, 1040, 1042, 1046, 1081, 1083].map((year): TimelineMarker => ({ label: String(year), year })),
        { endYear: 1145, label: "Uroš", year: 1112 },
      ],
      1000,
    );
    expect(layout.width).toBeGreaterThan(1000);
    // A line every year, the year every five.
    expect(layout.ticks[1].year - layout.ticks[0].year).toBe(1);
    expect(layout.ticks.filter((tick) => tick.label).slice(0, 3).map((tick) => tick.year)).toEqual([1000, 1005, 1010]);
    expect(layout.ticks.at(-1)?.year).toBe(1145);
    // 1040 and 1042 are 40px apart at 20px a year: the second goes up a row.
    expect(layout.points[1].row).toBe(0);
    expect(layout.points[2].row).toBe(1);
  });

  it("stacks events in the same year in rows", () => {
    const layout = layoutTimeline(
      [{ label: "Lazar", year: 1371 }, { label: "Kosovo", year: 1389 }, { label: "Milica", year: 1389 }, { label: "Stefan", year: 1389 }],
      1000,
    );
    expect(layout.points.map((point) => point.row)).toEqual([0, 0, 1, 2]);
    expect(layout.rows).toBe(3);
    expect(at(layout, 1)).toBe(at(layout, 2));
  });

  it("spans the common era, and draws ranges", () => {
    const layout = layoutTimeline([{ label: "Marathon", year: -490 }, { endYear: 476, label: "Rome", year: 27 }], 1000);
    expect(layout.ticks[0].year).toBeLessThanOrEqual(-490);
    expect(layout.points[1].end).toBeGreaterThan(at(layout, 1));
  });

  it("spaces points evenly when one has no year", () => {
    const layout = layoutTimeline([{ label: "A", year: 1200 }, { label: "B" }, { label: "C", year: 1300 }], 1000);
    expect(layout.dated).toBe(false);
    expect(at(layout, 1) - at(layout, 0)).toBeCloseTo(at(layout, 2) - at(layout, 1));
    expect(layout.ticks).toEqual([]);
  });
});

describe("reading progress", () => {
  it("is -1 before the first marker, fractional between markers, the last at the end", () => {
    expect(readingProgress([300, 700], 100)).toBe(-1);
    expect(readingProgress([0, 400], 100)).toBeCloseTo(0.25);
    expect(readingProgress([-500, -100], 100)).toBe(1);
  });

  it("reads 40% down the text, and sweeps to the bottom in the lesson's last screen", () => {
    // Text visible from 100 to 1100 under the bar.
    expect(readingLine({ bottom: 1100, remaining: 5000, top: 100 })).toBe(500);
    expect(readingLine({ bottom: 1100, remaining: 300, top: 100 })).toBe(800);
    expect(readingLine({ bottom: 1100, remaining: 0, top: 100 })).toBe(1100);
    // Points at 900 and 1000, not reachable by scrolling: passed one by one.
    expect(readingProgress([200, 900, 1000], readingLine({ bottom: 1100, remaining: 300, top: 100 }))).toBeCloseTo(0.86, 1);
    expect(readingProgress([200, 900, 1000], readingLine({ bottom: 1100, remaining: 150, top: 100 }))).toBeCloseTo(1.5);
    expect(readingProgress([200, 900, 1000], readingLine({ bottom: 1100, remaining: 0, top: 100 }))).toBe(2);
  });

  it("moves the bar's now between points, and slides a long bar to keep it in view", () => {
    const layout = layoutTimeline([{ label: "A", year: 0 }, { label: "B", year: 100 }], 1000);
    expect(timelinePosition(layout, -1)).toBe(layout.points[0].x);
    expect(timelinePosition(layout, 0.5)).toBeCloseTo((layout.points[0].x + layout.points[1].x) / 2);
    expect(timelineOffset(layout, 500, 1000)).toBe(0);
    const long = { ...layout, width: 3000 };
    expect(timelineOffset(long, 1500, 1000)).toBeCloseTo(1500 - 1000 / 3);
    expect(timelineOffset(long, 2900, 1000)).toBe(2000);
    // The current point stays in the window, with room for its name.
    expect(timelineOffset(long, 1500, 1000, 1200)).toBe(1060);
  });
});

describe("timelineDateText", () => {
  const bce = (year: number) => `${year} BC`;

  it("writes years, ranges and years before the common era", () => {
    expect(timelineDateText({ label: "A", year: 1389 }, bce)).toBe("1389");
    expect(timelineDateText({ endYear: 1918, label: "A", year: 1914 }, bce)).toBe("1914–1918");
    expect(timelineDateText({ label: "A", year: -490 }, bce)).toBe("490 BC");
    expect(timelineDateText({ dateText: "14. vek", label: "A", year: 1350 }, bce)).toBe("14. vek");
    expect(timelineDateText({ label: "A" }, bce)).toBe("");
  });
});

describe("visiblePointYears", () => {
  const points = [100, 130, 400, 420, 800].map((x, index) => ({ end: null, row: index === 3 ? 1 : 0, x }));

  it("shows the current point's year with room for its name, and others where they fit in their row", () => {
    expect(visiblePointYears(points, -1)).toEqual([true, false, true, true, true]);
    expect(visiblePointYears(points, 1)).toEqual([false, true, true, true, true]);
  });
});
