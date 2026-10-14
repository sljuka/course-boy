import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ensureLocalCoursesRoot } from "./course-paths";
import { getCourseDetails } from "./course-registry";
import { lessonBodyFromMarkdown, lessonBodyToMarkdown, registerMcpTools, testFromQuestions } from "./mcp-tools";
import { readProgram } from "./program-paths";

let userDataDir = "";

vi.mock("electron", () => ({
  app: { getName: () => "matko", getPath: () => userDataDir },
  dialog: { showOpenDialog: vi.fn() },
}));

process.env.APP_ROOT = process.cwd();

let client: Client;
const changed = vi.fn();

beforeEach(async () => {
  userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "matko-mcp-"));
  changed.mockClear();
  const server = new McpServer({ name: "matko", version: "test" });
  registerMcpTools(server, {
    changed,
    ownCourseEntry: async (courseId) => ({
      code: null,
      courseId,
      snapshot: { locales: { en: { description: "", title: courseId } }, publisherId: null, supportedLocales: ["en"], version: null },
    }),
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: "test", version: "1" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
});

afterEach(async () => {
  await client.close();
  await fs.rm(userDataDir, { force: true, recursive: true });
});

async function call<T = Record<string, unknown>>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const response = await client.callTool({ arguments: args, name });
  const text = (response.content as { text: string }[])[0].text;
  if (response.isError) throw new Error(text);
  return JSON.parse(text) as T;
}

describe("lesson text", () => {
  it("wraps plain Markdown in one block, and gives text-only lessons back as plain Markdown", () => {
    const body = lessonBodyFromMarkdown("# Addition\n\nTwo plus two.");

    expect(body).toBe("[matko-block]: <> (markdown)\n# Addition\n\nTwo plus two.");
    expect(lessonBodyToMarkdown(body)).toBe("# Addition\n\nTwo plus two.");
  });

  it("keeps a lesson with images as stored, markers and all", () => {
    const body = "[matko-block]: <> (markdown)\nLook:\n[matko-block]: <> (image)\n![A cat](cat-1234.png)";

    expect(lessonBodyFromMarkdown(body)).toBe(body);
    expect(lessonBodyToMarkdown(body)).toBe(body);
  });
});

describe("questions", () => {
  it("become multiple choice and numeric exercises", () => {
    expect(
      testFromQuestions(
        [
          { correct: [1], options: ["3", "4"], prompt: "2 + 2?", type: "multiple_choice" },
          { answer: "a + b", prompt: "{{a}} + {{b}}?", type: "number", variables: { a: { max: 9, min: 1 }, b: { max: 9, min: 1 } } },
        ],
        "en",
      ).exercises,
    ).toEqual([
      {
        correctOptionIndexes: [1],
        kind: "multiple-choice",
        locales: { en: { options: ["3", "4"], prompt: "2 + 2?" } },
        selectionMode: "single",
        tags: [],
      },
      {
        kind: "numeric",
        locales: { en: { prompt: "{{a}} + {{b}}?" } },
        solution: { formula: "a + b", precision: 0 },
        tags: [],
        variables: { a: { max: 9, min: 1, type: "integer" }, b: { max: 9, min: 1, type: "integer" } },
      },
    ]);
  });

  it("become fill-in exercises, with the blanks in the order the text names them", () => {
    expect(
      testFromQuestions(
        [
          {
            blanks: { second: { answers: ["Tuesday"], matchCase: true }, first: { answers: ["Monday", "Mon"] } },
            hint: "Days start with a capital letter.",
            prompt: "Write the missing days",
            text: "{{first}}, {{second}}, Wednesday",
            type: "fill_in",
          },
        ],
        "en",
      ).exercises,
    ).toEqual([
      {
        kind: "missing-word",
        locales: {
          en: {
            hint: "Days start with a capital letter.",
            prompt: "Write the missing days",
            text: "{{first}}, {{second}}, Wednesday",
            variables: [
              { answers: ["Monday", "Mon"], matchCase: false, name: "first" },
              { answers: ["Tuesday"], matchCase: true, name: "second" },
            ],
          },
        },
        tags: [],
      },
    ]);
  });

  it("refuse a fill-in whose blanks and answers don't match", () => {
    const fillIn = { prompt: "Days", type: "fill_in" as const };

    expect(() => testFromQuestions([{ ...fillIn, blanks: {}, text: "No blank here" }], "en")).toThrow("no {{blank}}");
    expect(() => testFromQuestions([{ ...fillIn, blanks: {}, text: "{{d1}}" }], "en")).toThrow("no answers for the blank d1");
    expect(() =>
      testFromQuestions([{ ...fillIn, blanks: { d1: { answers: ["a"] }, d2: { answers: ["b"] } }, text: "{{d1}}" }], "en"),
    ).toThrow("has no blank d2");
  });

  it("refuse a correct option that doesn't exist", () => {
    expect(() =>
      testFromQuestions([{ correct: [2], options: ["a", "b"], prompt: "?", type: "multiple_choice" }], "en"),
    ).toThrow("past the last option");
  });
});

describe("the tools", () => {
  it("offer authoring only: nothing that publishes, shares or deletes", async () => {
    const names = (await client.listTools()).tools.map((tool) => tool.name).sort();

    expect(names).toEqual([
      "add_image",
      "commit_version",
      "create_course",
      "create_lesson",
      "create_program",
      "create_section",
      "create_section_test",
      "get_course",
      "get_program",
      "list_courses",
      "list_programs",
      "read_lesson",
      "read_section_test",
      "set_lesson_test",
      "set_section_test_questions",
      "update_course",
      "update_program",
      "update_section",
      "write_lesson",
      "write_section_intro",
    ]);
  });

  it("make a course with a lesson, its test and a section test, commit it, and put it in a program", async () => {
    const { courseId } = await call<{ courseId: string }>("create_course", { title: "Arithmetic" });
    const { sectionId } = await call<{ sectionId: string }>("create_section", { courseId, summary: "Adding up", title: "Addition" });
    const { lessonId } = await call<{ lessonId: string }>("create_lesson", {
      content: "## Two numbers\n\nPut them together.",
      courseId,
      sectionId,
      title: "Basics",
    });
    await call("set_lesson_test", {
      courseId,
      lessonId,
      questions: [{ correct: [0], options: ["4", "5"], prompt: "2 + 2?", type: "multiple_choice" }],
      sectionId,
    });
    await call("create_section_test", {
      courseId,
      questions: [{ answer: "a + b", prompt: "{{a}} + {{b}}?", type: "number", variables: { a: { max: 5, min: 1 }, b: { max: 5, min: 1 } } }],
      sectionId,
      title: "Review",
    });
    await call("write_section_intro", { content: "Welcome to adding.", courseId, sectionId });

    expect(await call("get_course", { courseId })).toMatchObject({
      sections: [
        {
          hasIntro: true,
          id: sectionId,
          lessons: [{ hasTest: true, id: lessonId, title: "Basics" }],
          summary: "Adding up",
          tests: [{ questionCount: 1, title: "Review" }],
          title: "Addition",
        },
      ],
      title: "Arithmetic",
    });
    expect(await call("read_lesson", { courseId, lessonId, sectionId })).toEqual({
      content: "## Two numbers\n\nPut them together.",
      questions: [{ correct: [0], options: ["4", "5"], prompt: "2 + 2?", type: "multiple_choice" }],
      title: "Basics",
    });

    // A version the app would accept: committing checks the whole package.
    expect(await call("commit_version", { courseId, notes: "First version" })).toMatchObject({ version: expect.any(String) });

    const { programId } = await call<{ programId: string }>("create_program", { description: "Start here", title: "Maths" });
    await call("update_program", { courseIds: [courseId], programId, theme: { background: "#ffffff", foreground: "#111111", primary: "#cc3300" } });
    expect(await readProgram(programId)).toMatchObject({
      courses: [{ courseId }],
      locales: { en: { description: "Start here", title: "Maths" } },
      theme: { primary: "#cc3300" },
    });
    expect(await call("list_programs")).toEqual([{ courseCount: 1, description: "Start here", id: programId, title: "Maths" }]);
    expect(changed).toHaveBeenCalled();
  });

  it("copy an image into a course and give back its lesson block", async () => {
    const { courseId } = await call<{ courseId: string }>("create_course", { title: "Pictures" });
    const { sectionId } = await call<{ sectionId: string }>("create_section", { courseId, title: "One" });
    const imagePath = path.join(userDataDir, "thor.png");
    await fs.writeFile(imagePath, Buffer.from("not really a png"));

    const { block, filename } = await call<{ block: string; filename: string }>("add_image", {
      alt: "Thor [with] his hammer",
      caption: 'Max Koch, "public domain"',
      courseId,
      filePath: imagePath,
    });

    expect(filename).toMatch(/^thor-[0-9a-f]+\.png$/);
    expect(block).toBe(`[matko-block]: <> (image)\n![Thor with his hammer](${filename} "Max Koch, 'public domain'")`);
    const { lessonId } = await call<{ lessonId: string }>("create_lesson", {
      content: `[matko-block]: <> (markdown)\nThursday is Thor's day.\n\n${block}`,
      courseId,
      sectionId,
      title: "Thursday",
    });
    expect(await call("read_lesson", { courseId, lessonId, sectionId })).toMatchObject({
      content: `[matko-block]: <> (markdown)\nThursday is Thor's day.\n\n${block}`,
    });
  });

  it("refuse an image path that isn't absolute or isn't a file", async () => {
    const { courseId } = await call<{ courseId: string }>("create_course", { title: "Pictures" });

    await expect(call("add_image", { alt: "x", courseId, filePath: "thor.png" })).rejects.toThrow("must be absolute");
    await expect(call("add_image", { alt: "x", courseId, filePath: userDataDir })).rejects.toThrow("is not a file");
  });

  it("update titles, and rewrite a lesson in place", async () => {
    const { courseId } = await call<{ courseId: string }>("create_course", { title: "Draft title" });
    const { sectionId } = await call<{ sectionId: string }>("create_section", { courseId, title: "One" });
    const { lessonId } = await call<{ lessonId: string }>("create_lesson", { courseId, sectionId, title: "First" });

    await call("update_course", { courseId, description: "All about it", title: "Final title" });
    await call("update_section", { courseId, sectionId, title: "Uno" });
    await call("write_lesson", { content: "New text.", courseId, lessonId, sectionId, title: "Renamed" });

    const details = await getCourseDetails(await ensureLocalCoursesRoot(), courseId, "en");
    expect(details).toMatchObject({ description: "All about it", title: "Final title" });
    expect(details?.sections[0]).toMatchObject({ lessons: [{ body: "[matko-block]: <> (markdown)\nNew text.", id: lessonId, title: "Renamed" }], title: "Uno" });
  });

  it("refuse a language the course doesn't have, as an error the agent sees", async () => {
    const { courseId } = await call<{ courseId: string }>("create_course", { title: "English only" });

    await expect(call("get_course", { courseId, language: "sr" })).rejects.toThrow('doesn\'t have the language "sr"');
    await expect(call("get_course", { courseId: "../etc" })).rejects.toThrow("Invalid course id");
  });
});
