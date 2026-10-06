// Profiles (SLJ-57): one folder per person on a shared computer, each with its
// own courses, publisher identity, sharing state and preferences. These are
// the rules both processes share; kept free of React and of Node so the main
// process and the renderer use the same ones. The folders themselves are
// managed by electron/profiles.ts.

import type { Persona } from "./preferences";
import { countCharacters } from "./section-summary";

export const MAX_PROFILE_NAME_LENGTH = 40;
// Lowercase letters and digits only, so case-insensitive filesystems can never
// hold two folders that differ only in case.
export const PROFILE_ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
export const PROFILE_ID_LENGTH = 16;
const MAX_SLUG_LENGTH = 24;
// "<slug>-<16 characters>": what a profile folder (and its id) looks like.
// Anything else from outside (a command-line argument) is refused.
export const PROFILE_FOLDER_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*-[a-z0-9]{16}$/;

export type ProfileSummary = {
  createdAt: string;
  // The folder name: "<slug>-<16 random characters>". Never changes.
  id: string;
  // As the person typed it ("Ana Petrović", "★Ana★", "😺").
  name: string;
  persona: Persona | null;
};

export type ProfilesState = {
  // The profile this window runs in, or null in the launcher (choosing or
  // creating a profile).
  active: ProfileSummary | null;
  // Every profile on this computer, the last used one first.
  profiles: ProfileSummary[];
};

export type ProfileNameCheck = { name: string; ok: true } | { ok: false; problem: "empty" | "tooLong" };

// Any characters are fine (symbols, emoji, Cyrillic): it's the person's own
// label. Trimmed; not empty; at most 40 characters as people count them.
export function checkProfileName(input: string): ProfileNameCheck {
  const name = input.trim();
  if (!name) return { ok: false, problem: "empty" };
  if (countCharacters(name) > MAX_PROFILE_NAME_LENGTH) return { ok: false, problem: "tooLong" };
  return { name, ok: true };
}

// Serbian and Russian Cyrillic, to Latin, for a readable folder name.
const CYRILLIC: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", ђ: "dj", е: "e", ё: "e", ж: "z", з: "z", и: "i", й: "j",
  ј: "j", к: "k", л: "l", љ: "lj", м: "m", н: "n", њ: "nj", о: "o", п: "p", р: "r", с: "s", т: "t",
  ћ: "c", у: "u", ф: "f", х: "h", ц: "c", ч: "c", џ: "dz", ш: "s", щ: "sc", ъ: "", ы: "y", ь: "",
  э: "e", ю: "ju", я: "ja",
};

// The readable part of a profile folder: lowercase ASCII letters and digits
// joined by "-". Diacritics are dropped (č → c), "đ" becomes "dj", Cyrillic is
// transliterated, anything else goes. Nothing left ("##$$%") → "profile".
// Windows' reserved names (CON, PRN…) can't come out as a whole folder name,
// because the random id is always appended.
export function slugifyProfileName(name: string): string {
  const latin = [...name.toLowerCase()]
    .map((character) => CYRILLIC[character] ?? (character === "đ" ? "dj" : character))
    .join("")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "");
  const slug = latin
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");

  return slug || "profile";
}

// A new profile's folder name, from 16 random characters (`random`: bytes,
// e.g. crypto.getRandomValues; injectable for tests).
export function createProfileId(name: string, random: (length: number) => Uint8Array): string {
  const bytes = random(PROFILE_ID_LENGTH);
  const suffix = [...bytes].map((byte) => PROFILE_ID_ALPHABET[byte % PROFILE_ID_ALPHABET.length]).join("");
  return `${slugifyProfileName(name)}-${suffix}`;
}
