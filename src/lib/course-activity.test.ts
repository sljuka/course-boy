import { describe, expect, it } from "vitest";

import { activityEventsFromProgress, bandOf, dayOf, summarizeActivity } from "@/lib/course-activity";

// SLJ-168: the events a student's progress means, and the teacher's totals.
const course = {
  sections: [
    { id: "basics", stepIds: ["lesson-1", "test-1"] },
    { id: "adding", stepIds: ["lesson-2"] },
  ],
  version: "1.0.0",
};
const monday = "2026-10-19T10:00:00.000Z";
const tuesday = "2026-10-20T10:00:00.000Z";
const ids = (events: { eventId: string }[]) => events.map((event) => event.eventId);

describe("activity events from progress", () => {
  it("imported only, before anything is opened", () => {
    expect(activityEventsFromProgress({ attempt: 1, course, importedAt: monday, progress: undefined })).toEqual([
      { day: dayOf(monday), eventId: "imported", payload: { kind: "imported", version: "1.0.0" } },
    ]);
  });

  it("a section once every one of its steps is done, the course once every section is", () => {
    const partly = {
      startedAt: monday,
      steps: { "lesson-1": { doneAt: monday }, "test-1": { doneAt: tuesday } },
    };
    const events = activityEventsFromProgress({ attempt: 1, course, importedAt: monday, progress: partly });
    expect(ids(events)).toEqual(["imported", "started", "section/1/basics"]);
    expect(events[2].day).toBe(dayOf(tuesday));

    const all = { ...partly, steps: { ...partly.steps, "lesson-2": { doneAt: tuesday } } };
    expect(ids(activityEventsFromProgress({ attempt: 2, course, importedAt: monday, progress: all }))).toEqual([
      "imported",
      "started",
      "section/2/basics",
      "section/2/adding",
      "finished/2",
    ]);
  });

  it("reaching the end with what was done then; nothing per attempt after the fifth", () => {
    const skipped = { reachedEnd: { at: monday, done: 1, total: 3 }, startedAt: monday, steps: { "lesson-2": { doneAt: monday } } };
    const events = activityEventsFromProgress({ attempt: 1, course, importedAt: null, progress: skipped });
    expect(events.map((event) => event.payload)).toEqual([
      { kind: "started", version: "1.0.0" },
      { attempt: 1, kind: "section", section: "adding", version: "1.0.0" },
      { attempt: 1, band: "25-49", kind: "end", version: "1.0.0" },
    ]);
    expect(ids(activityEventsFromProgress({ attempt: 6, course, importedAt: null, progress: skipped }))).toEqual(["started"]);
  });

  it("bands", () => {
    expect([bandOf(0, 0), bandOf(1, 5), bandOf(2, 4), bandOf(3, 4), bandOf(4, 4)]).toEqual([
      "under-25",
      "under-25",
      "50-74",
      "75-99",
      "all",
    ]);
  });
});

describe("activity summary", () => {
  it("lists per-attempt counts by attempt", () => {
    expect(
      summarizeActivity({
        "end/1/all": 4,
        "end/2/under-25": 1,
        "finished/1": 4,
        "finished/3": 1,
        imported: 9,
        "section/1/basics": 6,
        started: 7,
        "unknown/1": 3,
      }),
    ).toEqual({
      finished: [4, 0, 1],
      imported: 9,
      reachedEnd: [
        { "25-49": 0, "50-74": 0, "75-99": 0, all: 4, "under-25": 0 },
        { "25-49": 0, "50-74": 0, "75-99": 0, all: 0, "under-25": 1 },
      ],
      sections: { basics: [6] },
      started: 7,
    });
  });
});
