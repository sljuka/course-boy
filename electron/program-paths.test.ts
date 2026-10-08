import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createProgram,
  getProgramsRoot,
  listPrograms,
  readProgram,
  removeProgram,
  resolveProgramAsset,
  updateProgram,
  uploadProgramImage,
} from "./program-paths";

let userDataDir = "";
let pickedFile = "";

vi.mock("electron", () => ({
  app: { getName: () => "matko", getPath: () => userDataDir },
  dialog: { showOpenDialog: vi.fn(async () => ({ canceled: false, filePaths: [pickedFile] })) },
}));

beforeEach(async () => {
  userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "matko-programs-"));
});

afterEach(async () => {
  await fs.rm(userDataDir, { force: true, recursive: true });
});

describe("programs on disk (SLJ-32)", () => {
  it("creates a program and lists it in the reader's language", async () => {
    const { programId } = await createProgram({ locale: "en", title: "Cypherpunks" });
    const program = await readProgram(programId);

    expect(program).toMatchObject({ courses: [], defaultLocale: "en", formatVersion: 1, id: programId });
    expect(await listPrograms("sr")).toEqual([
      expect.objectContaining({ courseCount: 0, distribution: "local", id: programId, title: "Cypherpunks" }),
    ]);
  });

  it("saves an edit, and refuses invalid data", async () => {
    const { programId } = await createProgram({ locale: "en", title: "Cypherpunks" });
    const program = await readProgram(programId);

    await updateProgram({
      ...program,
      locales: { en: { description: "From the list to Bitcoin.", title: "Cypherpunks" } },
      theme: { background: "#0b0f0c", foreground: "#d1fae5", primary: "#22c55e" },
    });
    expect((await readProgram(programId)).theme).toEqual({ background: "#0b0f0c", foreground: "#d1fae5", primary: "#22c55e" });

    await expect(updateProgram({ ...program, logo: "../escape.png" })).rejects.toThrow("Program data is invalid");
  });

  it("stores a picked image and serves it, nothing outside the program's assets", async () => {
    const { programId } = await createProgram({ locale: "en", title: "Cypherpunks" });
    pickedFile = path.join(userDataDir, "logo.png");
    await fs.writeFile(pickedFile, "not really a png");

    const upload = await uploadProgramImage(programId);
    expect(upload?.filename).toMatch(/^logo-[0-9a-f]{16}\.png$/);
    const program = await readProgram(programId);
    await updateProgram({ ...program, logo: upload!.filename });

    expect(await resolveProgramAsset(programId, upload!.filename)).toMatchObject({ mimeType: "image/png" });
    expect(await resolveProgramAsset(programId, "../program.json")).toBeNull();
    expect(await resolveProgramAsset(programId, "missing-0123456789abcdef.png")).toBeNull();
  });

  it("refuses an id that would leave the programs folder, and removes a program", async () => {
    await expect(readProgram("../../etc")).rejects.toThrow("Invalid program id");

    const { programId } = await createProgram({ locale: "en", title: "Cypherpunks" });
    await removeProgram(programId);
    expect(await listPrograms("en")).toEqual([]);
  });

  it("leaves a damaged program out of the list instead of failing it", async () => {
    await createProgram({ locale: "en", title: "Good" });
    await fs.mkdir(path.join(getProgramsRoot(), "abcdefghijklmnop"), { recursive: true });
    await fs.writeFile(path.join(getProgramsRoot(), "abcdefghijklmnop", "program.json"), "{ broken");

    expect((await listPrograms("en")).map((program) => program.title)).toEqual(["Good"]);
  });
});
