import fs from "node:fs/promises";
import path from "node:path";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type {
  CourseExercise,
  CourseTest,
  SharedTestDefinition,
  SharedTestExerciseDefinition,
} from "../src/lib/course-package";
import { isValidCourseId } from "../src/lib/course-id";
import { type CourseTagDefinition, createCourseTagDefinition, courseTagColorOptions } from "../src/lib/course-tags";
import { isExerciseCount } from "../src/lib/course-exercise-pool";
import { DEFAULT_EXERCISE_POINTS, MAX_EXERCISE_POINTS, MIN_EXERCISE_POINTS } from "../src/lib/grade-bands";
import { isLocale, type Locale } from "../src/lib/i18n";
import { BLOCK_MARKER_PATTERN, blockMarker } from "../src/lib/lesson-block-markers";
import { extractMissingWordVariableNames, missingWordTextFromSegments } from "../src/lib/missing-word-markup";
import type { ProgramCourse, ProgramTheme } from "../src/lib/program-package";
import {
  createLocalCourseDraft,
  createLocalCourseLesson,
  createLocalCourseSection,
  createLocalCourseSectionTest,
  cutLocalCourseVersion,
  ensureLocalCoursesRoot,
  getLocalCourseLessonTestDraft,
  getLocalCourseSectionTestDraft,
  updateLocalCourseDraftMetadata,
  updateLocalCourseLessonContent,
  updateLocalCourseLessonMetadata,
  updateLocalCourseLessonTest,
  updateLocalCourseSection,
  updateLocalCourseSectionIntro,
  updateLocalCourseSectionTest,
  updateLocalCourseSectionTestMetadata,
  uploadCourseAssetFromBytes,
} from "./course-paths";
import { getCourseDetails, listCourses } from "./course-registry";
import { createProgram, listPrograms, readProgram, updateProgram } from "./program-paths";

// The tools Matko offers an agent over MCP (SLJ-68): making courses and
// programs on the open profile, through the same functions as the app's own
// IPC handlers, so their checks and safe writes apply unchanged.
//
// Deliberately not here (the person does these in the app): publishing,
// sharing codes, maintainers, anything with the publishing identity or its
// password, and removing courses, programs or profiles.
//
// Agents get simple formats: a lesson is Markdown, a test is a list of
// questions; the conversions to the stored formats are below.

export type McpToolDeps = {
  // A course's entry for a program (its code once published, and its titles).
  ownCourseEntry(courseId: string): Promise<ProgramCourse>;
  // Something changed on disk: the open window refreshes what it shows.
  changed(): void;
};

// ─── Lessons: Markdown in, the stored block format out ──────────────────────

const MARKDOWN_MARKER = blockMarker("markdown");
const HEADING_MARKER = blockMarker("heading");

// Plain Markdown becomes one Markdown block; a body that already has
// `[matko-block]` markers (read from a lesson with images or exercises) is
// kept as it is.
export function lessonBodyFromMarkdown(markdown: string): string {
  const trimmed = markdown.trim();
  if (trimmed === "") return "";
  return trimmed.split("\n").some((line) => BLOCK_MARKER_PATTERN.test(line)) ? trimmed : `${MARKDOWN_MARKER}\n${trimmed}`;
}

// A lesson body for an agent: plain Markdown when it holds only text and
// headings (nothing lost by writing it back), else as stored, markers and all.
export function lessonBodyToMarkdown(body: string): string {
  const lines = body.split("\n");
  const markers = lines.filter((line) => BLOCK_MARKER_PATTERN.test(line));
  if (markers.some((line) => line !== MARKDOWN_MARKER && line !== HEADING_MARKER)) return body.trim();
  return lines
    .filter((line) => !BLOCK_MARKER_PATTERN.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// add_image copies a file the agent names; a bound keeps one mistaken path
// from filling the course with a huge file.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// ─── Tests: a list of questions ─────────────────────────────────────────────

// A graded test's points for a question (SLJ-135).
const points = z
  .number()
  .int()
  .min(MIN_EXERCISE_POINTS)
  .max(MAX_EXERCISE_POINTS)
  .optional()
  .describe(`Points for solving it in a graded test (default ${DEFAULT_EXERCISE_POINTS})`);

// A question's tags, by label: the course's own (update_course sets them).
// Randomization picks by them (SLJ-135 follow-up).
const tags = z
  .array(z.string().min(1))
  .optional()
  .describe("Labels of the course's tags this question has, for a test's randomization rules");

const questionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("multiple_choice"),
    prompt: z.string().min(1),
    options: z.array(z.string().min(1)).min(2),
    correct: z.array(z.number().int().min(0)).min(1).describe("0-based indexes of the correct options"),
    hint: z.string().optional(),
    points,
    tags,
  }),
  z.object({
    type: z.literal("number"),
    prompt: z
      .string()
      .min(1)
      .describe("May use variables as {{a}}; each is rolled anew for every student"),
    answer: z
      .string()
      .min(1)
      .optional()
      .describe('A number ("42") or a formula over the variables ("a + b"). Give this or `answers`.'),
    answers: z
      .array(
        z.object({
          label: z.string().min(1).describe('What this box asks for, e.g. "Bob"'),
          answer: z
            .string()
            .min(1)
            .describe("A number or a formula over the variables; a later answer can use earlier ones as solution1, solution2…"),
          decimals: z.number().int().min(0).max(6).optional(),
        }),
      )
      .min(2)
      .optional()
      .describe("Several solutions, each answered in its own labelled box (instead of `answer`)"),
    decimals: z.number().int().min(0).max(6).optional().describe("Decimal places the answer is checked to (default 0)"),
    variables: z
      .record(
        z.string().regex(/^[a-z][a-z0-9_]*$/),
        z.object({ min: z.number().int(), max: z.number().int() }),
      )
      .optional()
      .describe("Whole-number variables used in the prompt and formula"),
    hint: z.string().optional(),
    points,
    tags,
  }),
  z.object({
    type: z.literal("fill_in"),
    prompt: z.string().min(1).describe('The instruction, e.g. "Write the missing day"'),
    text: z
      .string()
      .min(1)
      .describe('The text the student fills in, with a named blank for each typed answer: "Monday, {{d2}}, Wednesday"'),
    blanks: z
      .record(
        z.string().regex(/^\w+$/),
        z.object({
          answers: z.array(z.string().trim().min(1)).min(1).describe("Every answer accepted for this blank"),
          matchCase: z.boolean().optional().describe("Whether capital letters must match too (default false)"),
        }),
      )
      .describe("Each blank named in the text, with its accepted answers"),
    hint: z.string().optional(),
    points,
    tags,
  }),
]);

type Question = z.infer<typeof questionSchema>;

// The settings of a test the questions don't carry.
export type TestSettings = Pick<
  SharedTestDefinition,
  | "exerciseCount"
  | "graded"
  | "gradeBands"
  | "includeCourseExercises"
  | "partialCredit"
  | "showMnemonics"
  | "showStartScreen"
  | "showSummary"
  | "structure"
>;

// `kept`: the test's settings (those of a test being replaced, with what the
// call changes). `courseTags`: the course's, to turn questions' tag labels
// into the ids the test stores.
export function testFromQuestions(
  questions: Question[],
  locale: Locale,
  kept: TestSettings = {},
  courseTags: CourseTagDefinition[] = [],
): SharedTestDefinition {
  const exercises = questions.map((question): SharedTestExerciseDefinition => {
    const exercise = { ...exerciseFromQuestion(question, locale), tags: tagIds(question.tags ?? [], courseTags) };
    return question.points === undefined ? exercise : { ...exercise, points: question.points };
  });

  return {
    exercises,
    ...(kept.graded ? { graded: true } : {}),
    ...(kept.graded && kept.gradeBands ? { gradeBands: kept.gradeBands } : {}),
    ...(kept.graded && kept.partialCredit ? { partialCredit: true } : {}),
    ...(kept.includeCourseExercises ? { includeCourseExercises: true } : {}),
    ...(kept.includeCourseExercises && kept.exerciseCount && !kept.structure?.length
      ? { exerciseCount: kept.exerciseCount }
      : {}),
    ...(kept.showMnemonics ? { showMnemonics: true } : {}),
    ...(kept.showStartScreen !== undefined ? { showStartScreen: kept.showStartScreen } : {}),
    ...(kept.structure ? { structure: kept.structure } : {}),
    ...(kept.graded && kept.showSummary === false ? { showSummary: false } : {}),
    template: "",
  };
}

// Tag labels to the course's tag ids; an unknown label is the agent's mistake.
function tagIds(labels: string[], courseTags: CourseTagDefinition[]): string[] {
  return labels.map((label) => {
    const tag = courseTags.find((candidate) => candidate.label.toLowerCase() === label.trim().toLowerCase());
    if (!tag) {
      const known = courseTags.map((candidate) => `"${candidate.label}"`).join(", ") || "none yet (update_course sets them)";
      throw new Error(`The course has no tag "${label}" (it has ${known})`);
    }
    return tag.id;
  });
}

function exerciseFromQuestion(question: Question, locale: Locale): SharedTestExerciseDefinition {
  const hint = question.hint?.trim() ? { hint: question.hint.trim() } : {};

  if (question.type === "multiple_choice") {
    const correct = [...new Set(question.correct)].sort((left, right) => left - right);
    if (correct.some((index) => index >= question.options.length)) {
      throw new Error(`"${question.prompt}": a correct option index is past the last option`);
    }
    return {
      correctOptionIndexes: correct,
      kind: "multiple-choice",
      locales: { [locale]: { ...hint, options: question.options, prompt: question.prompt } },
      selectionMode: correct.length > 1 ? "multiple" : "single",
      tags: [],
    };
  }

  if (question.type === "fill_in") {
    const named = extractMissingWordVariableNames(question.text);
    if (named.length === 0) throw new Error(`"${question.prompt}": the text has no {{blank}} to fill in`);
    const missing = named.filter((name) => !(name in question.blanks));
    if (missing.length > 0) throw new Error(`"${question.prompt}": no answers for the blank ${missing.join(", ")}`);
    const unused = Object.keys(question.blanks).filter((name) => !named.includes(name));
    if (unused.length > 0) throw new Error(`"${question.prompt}": the text has no blank ${unused.join(", ")}`);
    return {
      kind: "missing-word",
      locales: {
        [locale]: {
          ...hint,
          prompt: question.prompt,
          text: question.text,
          variables: named.map((name) => ({
            answers: question.blanks[name].answers,
            matchCase: question.blanks[name].matchCase ?? false,
            name,
          })),
        },
      },
      tags: [],
    };
  }

  const variables = Object.fromEntries(
    Object.entries(question.variables ?? {}).map(([name, range]) => {
      if (range.min > range.max) throw new Error(`"${question.prompt}": variable ${name} has min above max`);
      return [name, { max: range.max, min: range.min, type: "integer" as const }];
    }),
  );
  // One answer, or several each in its own labelled box (SLJ-139).
  if (question.answers && question.answer) {
    throw new Error(`"${question.prompt}": give either answer or answers, not both`);
  }
  const solutions = question.answers
    ? question.answers.map((entry) => ({ formula: entry.answer, precision: entry.decimals ?? question.decimals ?? 0 }))
    : question.answer
      ? [{ formula: question.answer, precision: question.decimals ?? 0 }]
      : [];
  if (solutions.length === 0) throw new Error(`"${question.prompt}": a number question needs answer or answers`);
  const labels = question.answers?.map((entry) => entry.label);

  return {
    kind: "numeric",
    locales: { [locale]: { ...hint, prompt: question.prompt, ...(labels ? { solutionLabels: labels } : {}) } },
    ...(solutions.length > 1 ? { moreSolutions: solutions.slice(1) } : {}),
    solution: solutions[0],
    tags: [],
    variables,
  };
}

// A saved test as questions, for the kinds the tools can write; other kinds
// (made in the app) are named so the agent knows they're there.
export function questionsFromTest(test: CourseTest | null, courseTags: CourseTagDefinition[] = []): unknown[] {
  return (test?.exercises ?? []).map((exercise: CourseExercise) => ({
    ...questionFromExercise(exercise),
    ...(exercise.points !== undefined ? { points: exercise.points } : {}),
    ...(exercise.tags.length > 0 ? { tags: tagLabels(exercise.tags, courseTags) } : {}),
  }));
}

function tagLabels(ids: string[], courseTags: CourseTagDefinition[]): string[] {
  return ids.map((id) => courseTags.find((tag) => tag.id === id)?.label ?? id);
}

// A test's settings as an agent reads them: rules by tag label.
export function testSettingsFromTest(test: CourseTest | null, courseTags: CourseTagDefinition[] = []) {
  if (!test) return {};
  return {
    ...(test.graded ? { graded: true } : {}),
    ...(test.partialCredit ? { partialCredit: true } : {}),
    ...(test.structure?.length
      ? { randomize: test.structure.map((rule) => ({ count: rule.count, tag: tagLabels([rule.tag], courseTags)[0] })) }
      : {}),
    ...(test.includeCourseExercises ? { includeCourseExercises: true } : {}),
    ...(test.exerciseCount ? { exerciseCount: test.exerciseCount } : {}),
    ...(test.showStartScreen !== undefined ? { showStartScreen: test.showStartScreen } : {}),
    ...(test.showSummary === false ? { showSummary: false } : {}),
  };
}

function questionFromExercise(exercise: CourseExercise): Record<string, unknown> {
  if (exercise.kind === "multiple-choice") {
    return {
      correct: exercise.correctOptionIndexes,
      options: exercise.options,
      prompt: exercise.prompt,
      type: "multiple_choice",
      ...(exercise.hint ? { hint: exercise.hint } : {}),
    };
  }
  if (exercise.kind === "numeric") {
    const answers = exercise.moreSolutions?.length
      ? [{ formula: exercise.formula, precision: exercise.precision }, ...exercise.moreSolutions].map((solution, index) => ({
          answer: solution.formula,
          decimals: solution.precision,
          label: exercise.solutionLabels?.[index] ?? "",
        }))
      : null;
    return {
      ...(answers ? { answers } : { answer: exercise.formula, decimals: exercise.precision }),
      prompt: exercise.prompt,
      type: "number",
      ...(Object.keys(exercise.variables).length > 0
        ? {
            variables: Object.fromEntries(
              Object.entries(exercise.variables).map(([name, variable]) => [name, { max: variable.max, min: variable.min }]),
            ),
          }
        : {}),
      ...(exercise.hint ? { hint: exercise.hint } : {}),
    };
  }
  if (exercise.kind === "missing-word") {
    return {
      blanks: Object.fromEntries(
        exercise.variables.map((variable) => [variable.name, { answers: variable.answers, matchCase: variable.matchCase }]),
      ),
      prompt: exercise.prompt,
      text: missingWordTextFromSegments(exercise.segments),
      type: "fill_in",
      ...(exercise.hint ? { hint: exercise.hint } : {}),
    };
  }
  return { prompt: "prompt" in exercise ? exercise.prompt : "", type: exercise.kind, editable: false };
}

// ─── The tools ──────────────────────────────────────────────────────────────

const courseId = z.string().describe("The course's id, from list_courses");
const sectionId = z.string().describe("The section's id, from get_course");
const lessonId = z.string().describe("The lesson's id, from get_course");
const language = z
  .string()
  .optional()
  .describe('A language code the course supports ("en", "sr", "sr-Cyrl"); default: the course\'s main language');
const questions = z.array(questionSchema).min(1);
const graded = z
  .boolean()
  .optional()
  .describe(
    "A graded test (no feedback after each answer; the score at the end, from each question's points) instead of a practice test. Omitted when replacing questions: the test stays as it was.",
  );

const settings = z
  .object({
    graded: z.boolean().optional().describe("A graded test (see `graded`)"),
    partialCredit: z
      .boolean()
      .optional()
      .describe("Graded only: a question with several parts (blanks, several answers) earns its share of points for the parts right"),
    randomize: z
      .array(z.object({ count: z.number().int().min(1), tag: z.string().min(1).describe("A course tag's label") }))
      .nullable()
      .optional()
      .describe("Each attempt picks this many questions with each tag, at random; null turns randomization off"),
    includeCourseExercises: z
      .boolean()
      .optional()
      .describe("A final test: also uses the questions of the course's other tests"),
    exerciseCount: z
      .number()
      .int()
      .min(1)
      .nullable()
      .optional()
      .describe("With includeCourseExercises and no randomize: how many to pick, in turn from each test; null for all"),
    showStartScreen: z
      .boolean()
      .optional()
      .describe("A start screen before the first question (default: on for a section test, off for a lesson's)"),
    showSummary: z
      .boolean()
      .optional()
      .describe("Graded only: after the test, a summary of the student's answers and the correct ones (default on)"),
  })
  .optional()
  .describe("The test's settings; each one omitted stays as it was");

type SettingsInput = NonNullable<z.infer<typeof settings>>;

// A test's settings: those it had (`previous`), with what the call changes
// (`graded`, `settings`). Randomization rules come by tag label.
function resolveTestSettings(
  previous: SharedTestDefinition | null,
  graded: boolean | undefined,
  input: SettingsInput | undefined,
  courseTags: CourseTagDefinition[],
): TestSettings {
  const exerciseCount =
    input?.exerciseCount === undefined ? previous?.exerciseCount : (input.exerciseCount ?? undefined);
  if (exerciseCount !== undefined && !isExerciseCount(exerciseCount)) {
    throw new Error("exerciseCount must be a whole number from 1 to 500");
  }
  const structure =
    input?.randomize === undefined
      ? previous?.structure
      : input.randomize === null
        ? undefined
        : input.randomize.map((rule) => ({ count: rule.count, tag: tagIds([rule.tag], courseTags)[0] }));

  return {
    exerciseCount,
    graded: input?.graded ?? graded ?? previous?.graded,
    gradeBands: previous?.gradeBands,
    includeCourseExercises: input?.includeCourseExercises ?? previous?.includeCourseExercises,
    partialCredit: input?.partialCredit ?? previous?.partialCredit,
    showMnemonics: previous?.showMnemonics,
    showStartScreen: input?.showStartScreen ?? previous?.showStartScreen,
    showSummary: input?.showSummary ?? previous?.showSummary,
    structure,
  };
}

// The course's tags from labels: an existing label keeps its tag (its id, and
// its colour unless one is given); a new one gets a new id.
function courseTagsFrom(
  input: { color?: string; label: string }[],
  existing: CourseTagDefinition[],
): CourseTagDefinition[] {
  const next: CourseTagDefinition[] = [];
  for (const [index, entry] of input.entries()) {
    const label = entry.label.trim();
    const known = existing.find((tag) => tag.label.toLowerCase() === label.toLowerCase());
    const color = (entry.color ?? known?.color ?? courseTagColorOptions[index % courseTagColorOptions.length]) as CourseTagDefinition["color"];
    next.push(known ? { ...known, color, label } : createCourseTagDefinition(label, color, [...existing, ...next]));
  }
  return next;
}

function result(value: unknown) {
  return { content: [{ text: JSON.stringify(value, null, 2), type: "text" as const }] };
}

function requireCourseId(id: string): string {
  if (!isValidCourseId(id)) throw new Error(`Invalid course id "${id}"`);
  return id;
}

async function ownCourse(id: string, locale?: Locale) {
  const details = await getCourseDetails(await ensureLocalCoursesRoot(), requireCourseId(id), locale);
  if (!details) throw new Error(`No course "${id}"`);
  if (details.distribution !== "local") throw new Error("Only your own courses can be changed; this one is imported");
  return details;
}

async function courseLanguage(id: string, requested: string | undefined): Promise<Locale> {
  const details = await ownCourse(id);
  if (requested === undefined) return details.defaultLocale;
  if (!isLocale(requested) || !details.supportedLocales.includes(requested)) {
    throw new Error(`The course doesn't have the language "${requested}" (it has ${details.supportedLocales.join(", ")})`);
  }
  return requested;
}

async function ownProgram(id: string) {
  if (!isValidCourseId(id)) throw new Error(`Invalid program id "${id}"`);
  const program = await readProgram(id);
  if (program.kind === "channel") throw new Error("A channel is changed in the app (My channel)");
  return program;
}

export function registerMcpTools(server: McpServer, deps: McpToolDeps): void {
  // A write: then the open window refreshes.
  const write =
    <Args,>(run: (args: Args) => Promise<unknown>) =>
    async (args: Args) => {
      const value = await run(args);
      deps.changed();
      return result(value ?? { ok: true });
    };
  const read =
    <Args,>(run: (args: Args) => Promise<unknown>) =>
    async (args: Args) =>
      result(await run(args));

  // Courses ──────────────────────────────────────────────────────────────────

  server.registerTool(
    "list_courses",
    {
      annotations: { readOnlyHint: true },
      description: "Lists your own courses (the ones you can change), with their ids, titles, languages and versions.",
    },
    read(async () =>
      (await listCourses(await ensureLocalCoursesRoot()))
        .filter((course) => course.distribution === "local")
        .map((course) => ({
          defaultLanguage: course.defaultLocale,
          description: course.description,
          id: course.id,
          languages: course.supportedLocales,
          newestVersion: course.versionBadge.kind === "version" ? course.versionBadge.version : null,
          publishedVersion: course.publishedVersion,
          title: course.title,
          unsavedDraftChanges: course.versionBadge.kind === "draft",
        })),
    ),
  );

  server.registerTool(
    "get_course",
    {
      annotations: { readOnlyHint: true },
      description:
        "A course's structure in order: its sections (with their summaries and whether they have an intro), each section's lessons (and whether a lesson has a test) and the section's own tests. Use read_lesson for a lesson's text.",
      inputSchema: { courseId, language },
    },
    read(async ({ courseId: id, language: requested }: { courseId: string; language?: string }) => {
      const locale = await courseLanguage(id, requested);
      const details = await ownCourse(id, locale);
      return {
        description: details.description,
        id: details.id,
        languages: details.supportedLocales,
        tags: details.descriptiveTags.map((tag) => ({ color: tag.color, label: tag.label })),
        sections: details.sections.map((section) => ({
          hasIntro: section.intro !== null,
          id: section.id,
          lessons: section.lessons.map((lesson) => ({ hasTest: lesson.test !== null, id: lesson.id, title: lesson.title })),
          summary: section.description ?? "",
          tests: section.tests.map((test) => ({ id: test.id, questionCount: test.test?.exercises.length ?? 0, title: test.title })),
          title: section.title,
        })),
        title: details.title,
      };
    }),
  );

  server.registerTool(
    "read_lesson",
    {
      annotations: { readOnlyHint: true },
      description:
        "A lesson's title and text (Markdown), and its test's questions if it has one. A lesson with images or exercises comes with its [matko-block] markers: keep them when writing it back.",
      inputSchema: { courseId, language, lessonId, sectionId },
    },
    read(async (args: { courseId: string; language?: string; lessonId: string; sectionId: string }) => {
      const locale = await courseLanguage(args.courseId, args.language);
      const details = await ownCourse(args.courseId, locale);
      const lesson = details.sections
        .find((section) => section.id === args.sectionId)
        ?.lessons.find((candidate) => candidate.id === args.lessonId);
      if (!lesson) throw new Error(`No lesson "${args.lessonId}" in section "${args.sectionId}"`);
      return {
        content: lessonBodyToMarkdown(lesson.body),
        questions: questionsFromTest(lesson.test, details.descriptiveTags),
        settings: testSettingsFromTest(lesson.test, details.descriptiveTags),
        title: lesson.title,
      };
    }),
  );

  server.registerTool(
    "read_section_test",
    {
      annotations: { readOnlyHint: true },
      description: "A section test's title, description, settings and questions.",
      inputSchema: { courseId, language, sectionId, testId: z.string().describe("The test's id, from get_course") },
    },
    read(async (args: { courseId: string; language?: string; sectionId: string; testId: string }) => {
      const locale = await courseLanguage(args.courseId, args.language);
      const details = await ownCourse(args.courseId, locale);
      const test = details.sections
        .find((section) => section.id === args.sectionId)
        ?.tests.find((candidate) => candidate.id === args.testId);
      if (!test) throw new Error(`No test "${args.testId}" in section "${args.sectionId}"`);
      return {
        ...(test.description ? { description: test.description } : {}),
        questions: questionsFromTest(test.test, details.descriptiveTags),
        settings: testSettingsFromTest(test.test, details.descriptiveTags),
        title: test.title,
      };
    }),
  );

  server.registerTool(
    "create_course",
    {
      description: "Creates a new course of your own (a draft, on this computer only). Returns its id.",
      inputSchema: {
        description: z.string().optional(),
        language: z.string().optional().describe('The course\'s language: "en", "sr" or "sr-Cyrl" (default "en")'),
        title: z.string().min(1),
      },
    },
    write(async (args: { description?: string; language?: string; title: string }) => {
      const locale = args.language ?? "en";
      if (!isLocale(locale)) throw new Error(`Unknown language "${locale}"`);
      return createLocalCourseDraft({
        defaultLocale: locale,
        locales: { [locale]: { description: args.description?.trim() ?? "", title: args.title.trim() } },
        supportedLocales: [locale],
      });
    }),
  );

  server.registerTool(
    "update_course",
    {
      description:
        "Changes a course's title or description, in one of its languages, or its tags (which questions carry, for tests' randomization rules).",
      inputSchema: {
        courseId,
        description: z.string().optional(),
        language,
        tags: z
          .array(z.object({ color: z.enum(courseTagColorOptions as [string, ...string[]]).optional(), label: z.string().min(1) }))
          .optional()
          .describe("The course's tags, replacing them; a label it already has keeps its tag (and the questions carrying it)"),
        title: z.string().min(1).optional(),
      },
    },
    write(async (args: {
      courseId: string;
      description?: string;
      language?: string;
      tags?: { color?: string; label: string }[];
      title?: string;
    }) => {
      const locale = await courseLanguage(args.courseId, args.language);
      const details = await ownCourse(args.courseId);
      const current = details.locales[locale] ?? { description: "", title: "" };
      await updateLocalCourseDraftMetadata({
        contentRating: details.contentRating,
        courseId: details.id,
        defaultLocale: details.defaultLocale,
        descriptiveTags: args.tags ? courseTagsFrom(args.tags, details.descriptiveTags) : details.descriptiveTags,
        locales: {
          ...details.locales,
          [locale]: { ...current, description: args.description ?? current.description, title: args.title ?? current.title },
        },
        supportedLocales: details.supportedLocales,
      });
      return null;
    }),
  );

  server.registerTool(
    "create_section",
    {
      description: "Adds a section at the end of a course. Returns its id.",
      inputSchema: {
        courseId,
        summary: z.string().max(128).optional().describe("One line shown wherever sections are listed"),
        title: z.string().min(1),
      },
    },
    write((args: { courseId: string; summary?: string; title: string }) =>
      createLocalCourseSection({ courseId: requireCourseId(args.courseId), description: args.summary, title: args.title }),
    ),
  );

  server.registerTool(
    "update_section",
    {
      description: "Changes a section's title or summary, in one of the course's languages.",
      inputSchema: { courseId, language, sectionId, summary: z.string().max(128).optional(), title: z.string().min(1).optional() },
    },
    write(async (args: { courseId: string; language?: string; sectionId: string; summary?: string; title?: string }) => {
      const locale = await courseLanguage(args.courseId, args.language);
      const details = await ownCourse(args.courseId, locale);
      const section = details.sections.find((candidate) => candidate.id === args.sectionId);
      if (!section) throw new Error(`No section "${args.sectionId}"`);
      await updateLocalCourseSection({
        courseId: args.courseId,
        locales: {
          [locale]: { description: args.summary ?? section.description ?? "", title: args.title ?? section.title },
        },
        sectionId: args.sectionId,
      });
      return null;
    }),
  );

  server.registerTool(
    "write_section_intro",
    {
      description:
        "Writes a section's intro (Markdown), shown to students before its first lesson. Replaces the intro in that language.",
      inputSchema: { content: z.string().min(1), courseId, language, sectionId },
    },
    write(async (args: { content: string; courseId: string; language?: string; sectionId: string }) => {
      const locale = await courseLanguage(args.courseId, args.language);
      await updateLocalCourseSectionIntro({
        courseId: args.courseId,
        locales: { [locale]: { body: lessonBodyFromMarkdown(args.content) } },
        sectionId: args.sectionId,
      });
      return null;
    }),
  );

  server.registerTool(
    "add_image",
    {
      description:
        "Copies an image file from this computer into a course, for its lessons and section intros. Returns the Markdown block to put in a lesson: lesson text with an image is a list of blocks, each after its [matko-block] marker (\"[matko-block]: <> (markdown)\" before text).",
      inputSchema: {
        alt: z.string().min(1).describe("What the image shows, for students who can't see it"),
        caption: z.string().optional().describe("Shown under the image, e.g. its author and licence"),
        courseId,
        filePath: z.string().min(1).describe("Absolute path of a .png, .jpg, .jpeg, .webp, .gif or .svg file"),
      },
    },
    write(async (args: { alt: string; caption?: string; courseId: string; filePath: string }) => {
      await ownCourse(args.courseId);
      if (!path.isAbsolute(args.filePath)) throw new Error("The file path must be absolute");
      const stat = await fs.stat(args.filePath);
      if (!stat.isFile()) throw new Error(`"${args.filePath}" is not a file`);
      if (stat.size > MAX_IMAGE_BYTES) throw new Error("The image is larger than 10 MB");
      const data = await fs.readFile(args.filePath);
      const uploaded = await uploadCourseAssetFromBytes({
        courseId: args.courseId,
        data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
        filename: path.basename(args.filePath),
        kind: "image",
      });
      // The image block's own format (lesson-content-markdown.ts), so quotes
      // and brackets can't break out of it.
      const alt = args.alt.replace(/[[\]]/g, "");
      const caption = args.caption?.trim().replace(/"/g, "'");
      const image = `![${alt}](${uploaded.path}${caption ? ` "${caption}"` : ""})`;
      return { block: `${blockMarker("image")}\n${image}`, filename: uploaded.path };
    }),
  );

  server.registerTool(
    "create_lesson",
    {
      description: "Adds a lesson at the end of a section, optionally with its text (Markdown). Returns its id.",
      inputSchema: { content: z.string().optional(), courseId, sectionId, title: z.string().min(1) },
    },
    write(async (args: { content?: string; courseId: string; sectionId: string; title: string }) => {
      const created = await createLocalCourseLesson({
        courseId: requireCourseId(args.courseId),
        sectionId: args.sectionId,
        title: args.title,
      });
      if (args.content?.trim()) {
        const details = await ownCourse(args.courseId);
        await updateLocalCourseLessonContent({
          courseId: args.courseId,
          lessonId: created.lessonId,
          locales: { [details.defaultLocale]: { body: lessonBodyFromMarkdown(args.content) } },
          sectionId: args.sectionId,
        });
      }
      return created;
    }),
  );

  server.registerTool(
    "write_lesson",
    {
      description: "Replaces a lesson's text (Markdown) in one of the course's languages, and optionally renames it.",
      inputSchema: { content: z.string(), courseId, language, lessonId, sectionId, title: z.string().min(1).optional() },
    },
    write(async (args: { content: string; courseId: string; language?: string; lessonId: string; sectionId: string; title?: string }) => {
      const locale = await courseLanguage(args.courseId, args.language);
      await updateLocalCourseLessonContent({
        courseId: args.courseId,
        lessonId: args.lessonId,
        locales: { [locale]: { body: lessonBodyFromMarkdown(args.content) } },
        sectionId: args.sectionId,
      });
      if (args.title) {
        await updateLocalCourseLessonMetadata({
          courseId: args.courseId,
          lessonId: args.lessonId,
          locales: { [locale]: { description: "", title: args.title } },
          sectionId: args.sectionId,
        });
      }
      return null;
    }),
  );

  server.registerTool(
    "set_lesson_test",
    {
      description:
        "Sets the test students take after a lesson, replacing any it had. Questions are multiple choice or a number (optionally with variables, so every student gets their own numbers).",
      inputSchema: { courseId, graded, language, lessonId, questions, sectionId, settings },
    },
    write(
      async (args: {
        courseId: string;
        graded?: boolean;
        language?: string;
        lessonId: string;
        questions: Question[];
        sectionId: string;
        settings?: SettingsInput;
      }) => {
        const locale = await courseLanguage(args.courseId, args.language);
        const courseTags = (await ownCourse(args.courseId)).descriptiveTags;
        const previous = await getLocalCourseLessonTestDraft({
          courseId: args.courseId,
          lessonId: args.lessonId,
          sectionId: args.sectionId,
        });
        await updateLocalCourseLessonTest({
          courseId: args.courseId,
          lessonId: args.lessonId,
          sectionId: args.sectionId,
          test: testFromQuestions(
            args.questions,
            locale,
            resolveTestSettings(previous, args.graded, args.settings, courseTags),
            courseTags,
          ),
        });
        return null;
      },
    ),
  );

  server.registerTool(
    "create_section_test",
    {
      description: "Adds a test of its own at the end of a section (not tied to a lesson), with its questions. Returns its id.",
      inputSchema: {
        courseId,
        description: z.string().optional().describe("A short instruction students see before and above the test"),
        graded,
        language,
        questions,
        sectionId,
        settings,
        title: z.string().min(1),
      },
    },
    write(
      async (args: {
        courseId: string;
        description?: string;
        graded?: boolean;
        language?: string;
        questions: Question[];
        sectionId: string;
        settings?: SettingsInput;
        title: string;
      }) => {
        const locale = await courseLanguage(args.courseId, args.language);
        const courseTags = (await ownCourse(args.courseId)).descriptiveTags;
        const test = testFromQuestions(
          args.questions,
          locale,
          resolveTestSettings(null, args.graded, args.settings, courseTags),
          courseTags,
        );
        const created = await createLocalCourseSectionTest({ courseId: args.courseId, sectionId: args.sectionId, title: args.title });
        if (args.description?.trim()) {
          await updateLocalCourseSectionTestMetadata({
            courseId: args.courseId,
            locales: { [locale]: { description: args.description.trim(), title: args.title } },
            sectionId: args.sectionId,
            testId: created.testId,
          });
        }
        await updateLocalCourseSectionTest({ courseId: args.courseId, sectionId: args.sectionId, test, testId: created.testId });
        return created;
      },
    ),
  );

  server.registerTool(
    "set_section_test_questions",
    {
      description: "Replaces a section test's questions.",
      inputSchema: { courseId, graded, language, questions, sectionId, settings, testId: z.string() },
    },
    write(
      async (args: {
        courseId: string;
        graded?: boolean;
        language?: string;
        questions: Question[];
        sectionId: string;
        settings?: SettingsInput;
        testId: string;
      }) => {
        const locale = await courseLanguage(args.courseId, args.language);
        const courseTags = (await ownCourse(args.courseId)).descriptiveTags;
        const previous = await getLocalCourseSectionTestDraft({
          courseId: args.courseId,
          sectionId: args.sectionId,
          testId: args.testId,
        });
        await updateLocalCourseSectionTest({
          courseId: args.courseId,
          sectionId: args.sectionId,
          test: testFromQuestions(
            args.questions,
            locale,
            resolveTestSettings(previous, args.graded, args.settings, courseTags),
            courseTags,
          ),
          testId: args.testId,
        });
        return null;
      },
    ),
  );

  server.registerTool(
    "update_section_test",
    {
      description:
        "Changes a section test's title or description (a short instruction students see), in one of the course's languages.",
      inputSchema: {
        courseId,
        description: z.string().optional(),
        language,
        sectionId,
        testId: z.string(),
        title: z.string().min(1).optional(),
      },
    },
    write(async (args: {
      courseId: string;
      description?: string;
      language?: string;
      sectionId: string;
      testId: string;
      title?: string;
    }) => {
      const locale = await courseLanguage(args.courseId, args.language);
      const details = await ownCourse(args.courseId, locale);
      const test = details.sections
        .find((section) => section.id === args.sectionId)
        ?.tests.find((candidate) => candidate.id === args.testId);
      if (!test) throw new Error(`No test "${args.testId}" in section "${args.sectionId}"`);
      // The app's rename writes every language's title at once: the others
      // are kept as they are.
      await updateLocalCourseSectionTestMetadata({
        courseId: args.courseId,
        locales: {
          ...test.locales,
          [locale]: {
            description: args.description?.trim() ?? test.locales?.[locale]?.description ?? "",
            title: args.title ?? test.locales?.[locale]?.title ?? test.title,
          },
        },
        sectionId: args.sectionId,
        testId: args.testId,
      });
      return null;
    }),
  );

  server.registerTool(
    "commit_version",
    {
      description:
        "Commits the course's draft as a new version (on this computer; publishing it stays with the person, in the app). An update is the usual kind; a new edition is a big change. Returns the version number.",
      inputSchema: {
        courseId,
        fixesMistakes: z.boolean().optional().describe("Students who have the course see it as a recommended update"),
        kind: z.enum(["update", "new_edition"]).optional().describe('Default "update"'),
        notes: z.string().optional().describe("Release notes for students (Markdown)"),
      },
    },
    write((args: { courseId: string; fixesMistakes?: boolean; kind?: "new_edition" | "update"; notes?: string }) =>
      cutLocalCourseVersion({
        courseId: requireCourseId(args.courseId),
        notes: args.notes,
        recommended: args.fixesMistakes,
        releaseType: args.kind === "new_edition" ? "major" : "minor",
      }),
    ),
  );

  // Programs ─────────────────────────────────────────────────────────────────

  server.registerTool(
    "list_programs",
    {
      annotations: { readOnlyHint: true },
      description: "Lists your own programs (ordered sets of courses), with their ids, titles and course counts.",
    },
    read(async () =>
      (await listPrograms("en", () => []))
        .filter((program) => program.distribution === "local" && program.kind === "program")
        .map((program) => ({ courseCount: program.courseCount, description: program.description, id: program.id, title: program.title })),
    ),
  );

  server.registerTool(
    "get_program",
    {
      annotations: { readOnlyHint: true },
      description: "A program's titles, theme and courses in order.",
      inputSchema: { programId: z.string() },
    },
    read(async ({ programId }: { programId: string }) => {
      const program = await ownProgram(programId);
      return {
        courses: program.courses.map((course) => ({
          courseId: course.courseId,
          title: course.snapshot.locales[program.defaultLocale]?.title ?? Object.values(course.snapshot.locales)[0]?.title ?? "",
        })),
        defaultLanguage: program.defaultLocale,
        id: program.id,
        locales: program.locales,
        theme: program.theme,
      };
    }),
  );

  server.registerTool(
    "create_program",
    {
      description: "Creates a program of your own. Returns its id; add courses with update_program.",
      inputSchema: {
        description: z.string().optional(),
        language: z.string().optional().describe('"en", "sr" or "sr-Cyrl" (default "en")'),
        title: z.string().min(1),
      },
    },
    write(async (args: { description?: string; language?: string; title: string }) => {
      const locale = args.language ?? "en";
      if (!isLocale(locale)) throw new Error(`Unknown language "${locale}"`);
      const created = await createProgram({ locale, title: args.title.trim() });
      if (args.description?.trim()) {
        const program = await readProgram(created.programId);
        await updateProgram({ ...program, locales: { [locale]: { description: args.description.trim(), title: args.title.trim() } } });
      }
      return created;
    }),
  );

  const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

  server.registerTool(
    "update_program",
    {
      description:
        "Changes a program: its title and description (in its main language), its courses (your own courses' ids, in order; replaces the list) and its theme colors.",
      inputSchema: {
        courseIds: z.array(z.string()).optional(),
        description: z.string().optional(),
        programId: z.string(),
        theme: z
          .object({ background: hexColor, foreground: hexColor, primary: hexColor })
          .nullable()
          .optional()
          .describe("Colors as #rrggbb; null for the app's own"),
        title: z.string().min(1).optional(),
      },
    },
    write(
      async (args: {
        courseIds?: string[];
        description?: string;
        programId: string;
        theme?: ProgramTheme | null;
        title?: string;
      }) => {
        const program = await ownProgram(args.programId);
        const locale = program.defaultLocale;
        const current = program.locales[locale] ?? { description: "", title: "" };
        const courses = args.courseIds
          ? await Promise.all(
              args.courseIds.map(
                async (id) =>
                  program.courses.find((course) => course.courseId === id) ?? deps.ownCourseEntry((await ownCourse(id)).id),
              ),
            )
          : program.courses;
        await updateProgram({
          ...program,
          courses,
          locales: {
            ...program.locales,
            [locale]: { ...current, description: args.description ?? current.description, title: args.title ?? current.title },
          },
          theme: args.theme === undefined ? program.theme : args.theme,
        });
        return null;
      },
    ),
  );
}
