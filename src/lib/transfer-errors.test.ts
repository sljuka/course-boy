import { describe, expect, it } from "vitest";

import { transferErrorCode, transferErrorText } from "@/lib/transfer-errors";

// SLJ-153: a refused download, said in the student's language; other errors
// shown without Electron's IPC wrapping.
describe("transfer errors", () => {
  const t = ((key: string) => `t(${key})`) as never;
  const fromIpc = (message: string) =>
    new Error(`Error invoking remote method 'sharing:import-course': Error: ${message}`);

  it("recognises the worker's refusals by their code", () => {
    expect(transferErrorCode(fromIpc("TOO_MANY_FILES: More than 50000 files"))).toBe("TOO_MANY_FILES");
    expect(transferErrorText(fromIpc("COURSE_TOO_BIG: More than 10 bytes"), t)).toBe("t(transfer.errors.COURSE_TOO_BIG)");
    expect(transferErrorText(new Error("NOT_ENOUGH_SPACE: Needs 3 bytes free, 1 are"), t)).toBe(
      "t(transfer.errors.NOT_ENOUGH_SPACE)",
    );
  });

  it("shows any other error without the IPC wrapping", () => {
    expect(transferErrorCode(fromIpc("Not found"))).toBeNull();
    expect(transferErrorText(fromIpc("This code is not a course"), t)).toBe("This code is not a course");
    expect(transferErrorText(new Error("Plain"), t)).toBe("Plain");
  });
});
