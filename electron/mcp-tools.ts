import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type {
  CourseExercise,
  CourseTest,
  SharedTestDefinition,
  SharedTestExerciseDefinition,
} from "../src/lib/course-package";
import { isValidCourseId } from "../src/lib/course-id";
import { isLocale, type Locale } from "../src/lib/i18n";
import { BLOCK_MARKER_PATTERN, blockMarker } from "../src/lib/lesson-block-markers";
import type { ProgramCourse, ProgramTheme } from "../src/lib/program-package";
import {
  createLocalCourseDraft,
  createLocalCourseLesson,
  createLocalCourseSection,
  createLocalCourseSectionTest,
  cutLocalCourseVersion,
  ensureLocalCoursesRoot,
  updateLocalCourseDraftMetadata,
  updateLocalCourseLessonContent,
  updateLocalCourseLessonMetadata,
  updateLocalCourseLessonTest,
  updateLocalCourseSection,
  updateLocalCourseSectionIntro,
  updateLocalCourseSectionTest,
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

// ─── Tests: a list of questions ─────────────────────────────────────────────

const questionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("multiple_choice"),
    prompt: z.string().min(1),
    options: z.array(z.string().min(1)).min(2),
    correct: z.array(z.number().int().min(0)).min(1).describe("0-based indexes of the correct options"),
    hint: z.string().optional(),
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
      .describe('A number ("42") or a formula over the variables ("a + b")'),
    decimals: z.number().int().min(0).max(6).optional().describe("Decimal places the answer is checked to (default 0)"),
    variables: z
      .record(
        z.string().regex(/^[a-z][a-z0-9_]*$/),
        z.object({ min: z.number().int(), max: z.number().int() }),
      )
      .optional()
      .describe("Whole-number variables used in the prompt and formula"),
    hint: z.string().optional(),
  }),
]);

type Question = z.infer<typeof questionSchema>;

export function testFromQuestions(questions: Question[], locale: Locale): SharedTestDefinition {
  const exercises = questions.map((question): SharedTestExerciseDefinition => {
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

    const variables = Object.fromEntries(
      Object.entries(question.variables ?? {}).map(([name, range]) => {
        if (range.min > range.max) throw new Error(`"${question.prompt}": variable ${name} has min above max`);
        return [name, { max: range.max, min: range.min, type: "integer" as const }];
      }),
    );
    return {
      kind: "numeric",
      locales: { [locale]: { ...hint, prompt: question.prompt } },
      solution: { formula: question.answer, precision: question.decimals ?? 0 },
      tags: [],
      variables,
    };
  });

  return { exercises, template: "" };
}

// A saved test as questions, for the kinds the tools can write; other kinds
// (made in the app) are named so the agent knows they're there.
export function questionsFromTest(test: CourseTest | null): unknown[] {
  return (test?.exercises ?? []).map((exercise: CourseExercise) => {
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
      return {
        answer: exercise.formula,
        decimals: exercise.precision,
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
    return { prompt: "prompt" in exercise ? exercise.prompt : "", type: exercise.kind, editable: false };
  });
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
      return { content: lessonBodyToMarkdown(lesson.body), questions: questionsFromTest(lesson.test), title: lesson.title };
    }),
  );

  server.registerTool(
    "read_section_test",
    {
      annotations: { readOnlyHint: true },
      description: "A section test's title and questions.",
      inputSchema: { courseId, language, sectionId, testId: z.string().describe("The test's id, from get_course") },
    },
    read(async (args: { courseId: string; language?: string; sectionId: string; testId: string }) => {
      const locale = await courseLanguage(args.courseId, args.language);
      const details = await ownCourse(args.courseId, locale);
      const test = details.sections
        .find((section) => section.id === args.sectionId)
        ?.tests.find((candidate) => candidate.id === args.testId);
      if (!test) throw new Error(`No test "${args.testId}" in section "${args.sectionId}"`);
      return { questions: questionsFromTest(test.test), title: test.title };
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
      description: "Changes a course's title or description, in one of its languages.",
      inputSchema: { courseId, description: z.string().optional(), language, title: z.string().min(1).optional() },
    },
    write(async (args: { courseId: string; description?: string; language?: string; title?: string }) => {
      const locale = await courseLanguage(args.courseId, args.language);
      const details = await ownCourse(args.courseId);
      const current = details.locales[locale] ?? { description: "", title: "" };
      await updateLocalCourseDraftMetadata({
        contentRating: details.contentRating,
        courseId: details.id,
        defaultLocale: details.defaultLocale,
        descriptiveTags: details.descriptiveTags,
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
      inputSchema: { courseId, language, lessonId, questions, sectionId },
    },
    write(async (args: { courseId: string; language?: string; lessonId: string; questions: Question[]; sectionId: string }) => {
      const locale = await courseLanguage(args.courseId, args.language);
      await updateLocalCourseLessonTest({
        courseId: args.courseId,
        lessonId: args.lessonId,
        sectionId: args.sectionId,
        test: testFromQuestions(args.questions, locale),
      });
      return null;
    }),
  );

  server.registerTool(
    "create_section_test",
    {
      description: "Adds a test of its own at the end of a section (not tied to a lesson), with its questions. Returns its id.",
      inputSchema: { courseId, language, questions, sectionId, title: z.string().min(1) },
    },
    write(async (args: { courseId: string; language?: string; questions: Question[]; sectionId: string; title: string }) => {
      const locale = await courseLanguage(args.courseId, args.language);
      const test = testFromQuestions(args.questions, locale);
      const created = await createLocalCourseSectionTest({ courseId: args.courseId, sectionId: args.sectionId, title: args.title });
      await updateLocalCourseSectionTest({ courseId: args.courseId, sectionId: args.sectionId, test, testId: created.testId });
      return created;
    }),
  );

  server.registerTool(
    "set_section_test_questions",
    {
      description: "Replaces a section test's questions.",
      inputSchema: { courseId, language, questions, sectionId, testId: z.string() },
    },
    write(async (args: { courseId: string; language?: string; questions: Question[]; sectionId: string; testId: string }) => {
      const locale = await courseLanguage(args.courseId, args.language);
      await updateLocalCourseSectionTest({
        courseId: args.courseId,
        sectionId: args.sectionId,
        test: testFromQuestions(args.questions, locale),
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
