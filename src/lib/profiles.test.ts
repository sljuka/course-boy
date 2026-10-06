import { describe, expect, it } from "vitest";

import { checkProfileName, createProfileId, PROFILE_FOLDER_PATTERN, slugifyProfileName } from "./profiles";

describe("profile names", () => {
  it("accepts any characters, trimmed, up to 40 as people count them", () => {
    expect(checkProfileName("  Ana Petrović ")).toEqual({ name: "Ana Petrović", ok: true });
    expect(checkProfileName("##$$%")).toEqual({ name: "##$$%", ok: true });
    expect(checkProfileName("😺".repeat(40))).toMatchObject({ ok: true });
    expect(checkProfileName("😺".repeat(41))).toEqual({ ok: false, problem: "tooLong" });
    expect(checkProfileName("   ")).toEqual({ ok: false, problem: "empty" });
  });
});

describe("profile folder names", () => {
  it("are readable: lowercase ASCII, diacritics dropped, Cyrillic transliterated", () => {
    expect(slugifyProfileName("Ana Petrović")).toBe("ana-petrovic");
    expect(slugifyProfileName("Đorđe Šćekić")).toBe("djordje-scekic");
    expect(slugifyProfileName("Ђорђе Јовановић")).toBe("djordje-jovanovic");
    expect(slugifyProfileName("Мария")).toBe("marija");
    expect(slugifyProfileName("★Ana★ / 2.b")).toBe("ana-2-b");
  });

  it("fall back to 'profile' when nothing readable is left", () => {
    expect(slugifyProfileName("##$$%")).toBe("profile");
    expect(slugifyProfileName("😺")).toBe("profile");
  });

  it("are cut to a sensible length", () => {
    expect(slugifyProfileName("a".repeat(100)).length).toBeLessThanOrEqual(24);
  });

  it("end in 16 random lowercase letters or digits", () => {
    const id = createProfileId("Ana", (length) => crypto.getRandomValues(new Uint8Array(length)));
    expect(id).toMatch(/^ana-[a-z0-9]{16}$/);
    expect(PROFILE_FOLDER_PATTERN.test(id)).toBe(true);
    // Windows' reserved names can't be a whole folder name: the id is always appended.
    expect(createProfileId("CON", () => new Uint8Array(16))).toBe("con-aaaaaaaaaaaaaaaa");
  });

  it("refuse anything else as a profile id (no paths)", () => {
    for (const id of ["../etc", "ana", "Ana-aaaaaaaaaaaaaaaa", "ana-aaaa", "ana/x-aaaaaaaaaaaaaaaa"]) {
      expect(PROFILE_FOLDER_PATTERN.test(id)).toBe(false);
    }
  });
});
