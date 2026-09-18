import path from "node:path";

import { describe, expect, it } from "vitest";

import { getCourseDetails, isSharedTestDefinition, listCourses } from "./course-registry";

const coursesRoot = path.resolve(process.cwd(), "courses");

describe("listCourses", () => {
  it("returns the bundled getting started course", async () => {
    const courses = await listCourses(coursesRoot, "en");
    const gettingStartedCourse = courses.find(
      (course) => course.id === "matko-getting-started",
    );

    expect(courses).toHaveLength(1);
    expect(gettingStartedCourse?.lessonPreviews[0]?.title).toBe("What Matko Is");
    expect(gettingStartedCourse?.previewItems[0]).toMatchObject({
      id: "lesson-01-what-is-matko",
      kind: "lesson",
      title: "What Matko Is",
    });
    expect(gettingStartedCourse?.previewItems).toHaveLength(6);
    // Bundled (no draft/ to diverge from a cut) — always its own version,
    // never a "draft" badge. See computeCourseVersionBadge.
    expect(gettingStartedCourse?.distribution).toBe("bundled");
    expect(gettingStartedCourse?.versionBadge).toEqual({
      kind: "version",
      version: gettingStartedCourse?.version,
    });
  });
});

describe("getCourseDetails", () => {
  it("returns the configured entry section and section order", async () => {
    const course = await getCourseDetails(
      coursesRoot,
      "matko-getting-started",
      "en",
    );

    expect(course?.entrySectionId).toBe("section-01-welcome");
    expect(course?.sectionIds).toEqual([
      "section-01-welcome",
      "section-02-onboarding",
      "section-03-taking-a-course",
      "section-04-making-courses",
      "section-05-keys-and-identity",
      "section-06-sharing-courses",
      "section-07-safety-and-trust",
    ]);
  });

  it("returns localized section and lesson content for the bundled guide", async () => {
    const course = await getCourseDetails(
      coursesRoot,
      "matko-getting-started",
      "en",
    );

    expect(course?.sections[0]?.title).toBe("Welcome");
    expect(course?.sections[0]?.description).toBe(
      "What Matko is, who it is for, and how the app is organized.",
    );
    expect(course?.sections[0]?.lessons[0]?.body).toContain("# What Matko Is");
    expect(course?.sections[0]?.lessons[0]?.test).toBeNull();
  });
});

describe("isSharedTestDefinition", () => {
  const numericExercise = {
    kind: "numeric",
    locales: { en: { prompt: "{{a}} + {{b}}" } },
    solution: { formula: "a + b", precision: 0 },
    tags: ["easy"],
    variables: { a: { max: 10, min: 1, type: "integer" }, b: { max: 10, min: 1, type: "integer" } },
  };

  it("accepts a numeric exercise", () => {
    expect(isSharedTestDefinition({ exercises: [numericExercise], template: "" })).toBe(true);
  });

  it("accepts a numeric exercise with no `kind` field, defaulting to numeric", () => {
    const { kind: _kind, ...legacyExercise } = numericExercise;

    expect(isSharedTestDefinition({ exercises: [legacyExercise], template: "" })).toBe(true);
  });

  it("accepts a valid single-answer multiple-choice exercise", () => {
    const multipleChoiceExercise = {
      kind: "multiple-choice",
      correctOptionIndexes: [1],
      locales: { en: { options: ["London", "Paris"], prompt: "Capital of France?" } },
      selectionMode: "single",
      tags: ["geography"],
    };

    expect(
      isSharedTestDefinition({ exercises: [multipleChoiceExercise], template: "" }),
    ).toBe(true);
  });

  it("accepts a valid multiple-answer multiple-choice exercise", () => {
    const multipleChoiceExercise = {
      kind: "multiple-choice",
      correctOptionIndexes: [0, 2],
      locales: {
        en: {
          options: ["Paris", "Tokyo", "Berlin", "Cairo"],
          prompt: "Which are capitals of European countries?",
        },
      },
      selectionMode: "multiple",
      tags: ["geography"],
    };

    expect(
      isSharedTestDefinition({ exercises: [multipleChoiceExercise], template: "" }),
    ).toBe(true);
  });

  it("accepts a legacy multiple-choice exercise with a single correctOptionIndex and no selectionMode", () => {
    const legacyExercise = {
      kind: "multiple-choice",
      correctOptionIndex: 1,
      locales: { en: { options: ["London", "Paris"], prompt: "Capital of France?" } },
      tags: ["geography"],
    };

    expect(isSharedTestDefinition({ exercises: [legacyExercise], template: "" })).toBe(true);
  });

  it("accepts a multiple-choice exercise with an untranslated locale's options left blank", () => {
    const multipleChoiceExercise = {
      kind: "multiple-choice",
      correctOptionIndexes: [1],
      locales: {
        en: { options: ["London", "Paris"], prompt: "Capital of France?" },
        sr: { options: ["", ""], prompt: "" },
      },
      selectionMode: "single",
      tags: ["geography"],
    };

    expect(
      isSharedTestDefinition({ exercises: [multipleChoiceExercise], template: "" }),
    ).toBe(true);
  });

  it("rejects a multiple-choice exercise with fewer than two options", () => {
    const invalidExercise = {
      kind: "multiple-choice",
      correctOptionIndexes: [0],
      locales: { en: { options: ["Only one"], prompt: "?" } },
      selectionMode: "single",
      tags: ["geography"],
    };

    expect(isSharedTestDefinition({ exercises: [invalidExercise], template: "" })).toBe(false);
  });

  it("rejects a multiple-choice exercise with an out-of-range correct option index", () => {
    const invalidExercise = {
      kind: "multiple-choice",
      correctOptionIndexes: [5],
      locales: { en: { options: ["London", "Paris"], prompt: "Capital of France?" } },
      selectionMode: "single",
      tags: ["geography"],
    };

    expect(isSharedTestDefinition({ exercises: [invalidExercise], template: "" })).toBe(false);
  });

  it("rejects a single-answer multiple-choice exercise with more than one correct option", () => {
    const invalidExercise = {
      kind: "multiple-choice",
      correctOptionIndexes: [0, 1],
      locales: { en: { options: ["London", "Paris"], prompt: "Capital of France?" } },
      selectionMode: "single",
      tags: ["geography"],
    };

    expect(isSharedTestDefinition({ exercises: [invalidExercise], template: "" })).toBe(false);
  });

  it("accepts a multiple-answer multiple-choice exercise with no correct options marked", () => {
    const exercise = {
      kind: "multiple-choice",
      correctOptionIndexes: [],
      locales: { en: { options: ["London", "Paris"], prompt: "Which of these is not a city?" } },
      selectionMode: "multiple",
      tags: ["geography"],
    };

    expect(isSharedTestDefinition({ exercises: [exercise], template: "" })).toBe(true);
  });

  it("accepts a valid region-picker exercise", () => {
    const regionPickerExercise = {
      correctShapeIds: ["Norway", "Sweden"],
      kind: "region-picker",
      locales: { en: { prompt: "Mark Scandinavia" } },
      svgAssetFilename: "europe-abc123.svg",
      tags: ["geography"],
    };

    expect(isSharedTestDefinition({ exercises: [regionPickerExercise], template: "" })).toBe(true);
  });

  it("rejects a region-picker exercise with no correct shapes marked", () => {
    const invalidExercise = {
      correctShapeIds: [],
      kind: "region-picker",
      locales: { en: { prompt: "Mark Scandinavia" } },
      svgAssetFilename: "europe-abc123.svg",
      tags: ["geography"],
    };

    expect(isSharedTestDefinition({ exercises: [invalidExercise], template: "" })).toBe(false);
  });

  it("rejects a region-picker exercise with no SVG asset", () => {
    const invalidExercise = {
      correctShapeIds: ["Norway"],
      kind: "region-picker",
      locales: { en: { prompt: "Mark Scandinavia" } },
      svgAssetFilename: "",
      tags: ["geography"],
    };

    expect(isSharedTestDefinition({ exercises: [invalidExercise], template: "" })).toBe(false);
  });

  it("accepts a valid word-types exercise", () => {
    const wordTypeExercise = {
      kind: "word-types",
      locales: {
        en: {
          prompt: "Mark the nouns and verbs",
          text: "Mike{{n}} is jumping{{v}}.",
        },
      },
      tags: ["grammar"],
      wordTypes: [
        { color: "sky", icon: "🟦", id: "wt_noun", names: { en: "Noun" }, symbol: "n" },
        { color: "rose", icon: "🟥", id: "wt_verb", names: { en: "Verb" }, symbol: "v" },
      ],
    };

    expect(isSharedTestDefinition({ exercises: [wordTypeExercise], template: "" })).toBe(true);
  });

  it("accepts a word-types exercise with an untranslated locale's text left blank", () => {
    const wordTypeExercise = {
      kind: "word-types",
      locales: {
        en: { prompt: "Mark the nouns and verbs", text: "Mike{{n}} is jumping{{v}}." },
        sr: { prompt: "", text: "" },
      },
      tags: ["grammar"],
      wordTypes: [
        { color: "sky", icon: "🟦", id: "wt_noun", names: { en: "Noun" }, symbol: "n" },
        { color: "rose", icon: "🟥", id: "wt_verb", names: { en: "Verb" }, symbol: "v" },
      ],
    };

    expect(isSharedTestDefinition({ exercises: [wordTypeExercise], template: "" })).toBe(true);
  });

  it("accepts a word-types exercise whose word types have no icon", () => {
    const wordTypeExercise = {
      kind: "word-types",
      locales: {
        en: { prompt: "Mark the nouns and verbs", text: "Mike{{n}} is jumping{{v}}." },
      },
      tags: ["grammar"],
      wordTypes: [
        { color: "sky", icon: "", id: "wt_noun", names: { en: "Noun" }, symbol: "n" },
        { color: "rose", icon: "", id: "wt_verb", names: { en: "Verb" }, symbol: "v" },
      ],
    };

    expect(isSharedTestDefinition({ exercises: [wordTypeExercise], template: "" })).toBe(true);
  });

  it("accepts a word-types exercise with hex string colors", () => {
    const wordTypeExercise = {
      kind: "word-types",
      locales: {
        en: { prompt: "Mark the nouns and verbs", text: "Mike{{n}} is jumping{{v}}." },
      },
      tags: ["grammar"],
      wordTypes: [
        { color: "#bae6fd", icon: "", id: "wt_noun", names: { en: "Noun" }, symbol: "n" },
        { color: "#fbcfe8", icon: "", id: "wt_verb", names: { en: "Verb" }, symbol: "v" },
      ],
    };

    expect(isSharedTestDefinition({ exercises: [wordTypeExercise], template: "" })).toBe(true);
  });

  it("rejects a word-types exercise with an icon longer than 8 characters", () => {
    const invalidExercise = {
      kind: "word-types",
      locales: {
        en: { prompt: "Mark the nouns and verbs", text: "Mike{{n}} is jumping{{v}}." },
      },
      tags: ["grammar"],
      wordTypes: [
        { color: "sky", icon: "123456789", id: "wt_noun", names: { en: "Noun" }, symbol: "n" },
        { color: "rose", icon: "", id: "wt_verb", names: { en: "Verb" }, symbol: "v" },
      ],
    };

    expect(isSharedTestDefinition({ exercises: [invalidExercise], template: "" })).toBe(false);
  });

  it("rejects a word-types exercise referencing an undefined symbol", () => {
    const invalidExercise = {
      kind: "word-types",
      locales: { en: { prompt: "Mark the nouns", text: "Mike{{n}} is jumping{{v}}." } },
      tags: ["grammar"],
      wordTypes: [
        { color: "sky", icon: "🟦", id: "wt_noun", names: { en: "Noun" }, symbol: "n" },
      ],
    };

    expect(isSharedTestDefinition({ exercises: [invalidExercise], template: "" })).toBe(false);
  });

  it("rejects a word-types exercise with duplicate symbols", () => {
    const invalidExercise = {
      kind: "word-types",
      locales: { en: { prompt: "Mark the nouns", text: "Mike{{n}} is jumping{{n}}." } },
      tags: ["grammar"],
      wordTypes: [
        { color: "sky", icon: "🟦", id: "wt_noun", names: { en: "Noun" }, symbol: "n" },
        { color: "rose", icon: "🟥", id: "wt_verb", names: { en: "Verb" }, symbol: "n" },
      ],
    };

    expect(isSharedTestDefinition({ exercises: [invalidExercise], template: "" })).toBe(false);
  });

  it("rejects a word-types exercise with no word types defined", () => {
    const invalidExercise = {
      kind: "word-types",
      locales: { en: { prompt: "Mark the nouns", text: "Mike is jumping." } },
      tags: ["grammar"],
      wordTypes: [],
    };

    expect(isSharedTestDefinition({ exercises: [invalidExercise], template: "" })).toBe(false);
  });

  it("accepts a valid missing-word exercise with a single blank", () => {
    const missingWordExercise = {
      kind: "missing-word",
      locales: {
        en: {
          prompt: "Fill in the missing word",
          text: "The capital of France is {{c1}}.",
          variables: [{ answers: ["Paris"], matchCase: true, name: "c1" }],
        },
      },
      tags: ["geography"],
    };

    expect(isSharedTestDefinition({ exercises: [missingWordExercise], template: "" })).toBe(true);
  });

  it("accepts a valid missing-word exercise with multiple blanks", () => {
    const missingWordExercise = {
      kind: "missing-word",
      locales: {
        en: {
          prompt: "Fill in the missing words",
          text: "The capital of France is {{c1}}. Capital of Serbia is {{c2}}.",
          variables: [
            { answers: ["Paris"], matchCase: true, name: "c1" },
            { answers: ["Belgrade"], matchCase: false, name: "c2" },
          ],
        },
      },
      tags: ["geography"],
    };

    expect(isSharedTestDefinition({ exercises: [missingWordExercise], template: "" })).toBe(true);
  });

  it("accepts multiple accepted answers for one blank", () => {
    const missingWordExercise = {
      kind: "missing-word",
      locales: {
        en: {
          prompt: "Fill in the missing word",
          text: "The capital of France is {{c1}}.",
          variables: [{ answers: ["Paris", "City of Light"], matchCase: true, name: "c1" }],
        },
      },
      tags: ["geography"],
    };

    expect(isSharedTestDefinition({ exercises: [missingWordExercise], template: "" })).toBe(true);
  });

  it("rejects a missing-word exercise with no blank marked", () => {
    const invalidExercise = {
      kind: "missing-word",
      locales: {
        en: { prompt: "Fill in the missing word", text: "The capital of France is Paris.", variables: [] },
      },
      tags: ["geography"],
    };

    expect(isSharedTestDefinition({ exercises: [invalidExercise], template: "" })).toBe(false);
  });

  it("rejects a missing-word exercise with a blank that has no matching variable", () => {
    const invalidExercise = {
      kind: "missing-word",
      locales: {
        en: {
          prompt: "Fill in the missing word",
          text: "The capital of France is {{c1}}.",
          variables: [],
        },
      },
      tags: ["geography"],
    };

    expect(isSharedTestDefinition({ exercises: [invalidExercise], template: "" })).toBe(false);
  });

  it("rejects a missing-word exercise with an empty answer list", () => {
    const invalidExercise = {
      kind: "missing-word",
      locales: {
        en: {
          prompt: "Fill in the missing word",
          text: "The capital of France is {{c1}}.",
          variables: [{ answers: [], matchCase: true, name: "c1" }],
        },
      },
      tags: ["geography"],
    };

    expect(isSharedTestDefinition({ exercises: [invalidExercise], template: "" })).toBe(false);
  });

  it("accepts a missing-word exercise with no tags", () => {
    // Tags are optional — they only matter to exercise randomization, which
    // is itself optional.
    const validExercise = {
      kind: "missing-word",
      locales: {
        en: {
          prompt: "Fill in the missing word",
          text: "The capital of France is {{c1}}.",
          variables: [{ answers: ["Paris"], matchCase: true, name: "c1" }],
        },
      },
      tags: [],
    };

    expect(isSharedTestDefinition({ exercises: [validExercise], template: "" })).toBe(true);
  });
});
