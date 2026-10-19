import type { Locale } from "@/lib/i18n";
import { transliterateSerbianLatinToCyrillic } from "@/lib/serbian-transliteration";

// A board name for someone who hasn't set one (SLJ-149): a color and an
// animal from their key for the course ("Blue Otter"), the same on every
// device and every time on that course, and different on every other course
// (their key is). Never the profile name.
//
// Word lists rather than locale keys: in Serbian the color agrees with the
// animal's gender ("Plava vidra", "Plavi medved"), which needs the gender of
// each animal next to it. Both lists keep the same length and order in every
// language, so a person has the same name in each. Cyrillic is the Latin
// list transliterated.

type Gender = "f" | "m";

const COLORS: { en: string; sr: Record<Gender, string> }[] = [
  { en: "Blue", sr: { f: "Plava", m: "Plavi" } },
  { en: "Red", sr: { f: "Crvena", m: "Crveni" } },
  { en: "Green", sr: { f: "Zelena", m: "Zeleni" } },
  { en: "Yellow", sr: { f: "Žuta", m: "Žuti" } },
  { en: "Orange", sr: { f: "Narandžasta", m: "Narandžasti" } },
  { en: "Purple", sr: { f: "Ljubičasta", m: "Ljubičasti" } },
  { en: "Silver", sr: { f: "Srebrna", m: "Srebrni" } },
  { en: "Golden", sr: { f: "Zlatna", m: "Zlatni" } },
  { en: "White", sr: { f: "Bela", m: "Beli" } },
  { en: "Black", sr: { f: "Crna", m: "Crni" } },
  { en: "Gray", sr: { f: "Siva", m: "Sivi" } },
  { en: "Pink", sr: { f: "Ružičasta", m: "Ružičasti" } },
  { en: "Brown", sr: { f: "Smeđa", m: "Smeđi" } },
  { en: "Teal", sr: { f: "Tirkizna", m: "Tirkizni" } },
  { en: "Copper", sr: { f: "Bakarna", m: "Bakarni" } },
  { en: "Amber", sr: { f: "Ćilibarna", m: "Ćilibarni" } },
];

const ANIMALS: { en: string; sr: string; gender: Gender }[] = [
  { en: "Otter", gender: "f", sr: "vidra" },
  { en: "Fox", gender: "f", sr: "lisica" },
  { en: "Owl", gender: "f", sr: "sova" },
  { en: "Bear", gender: "m", sr: "medved" },
  { en: "Wolf", gender: "m", sr: "vuk" },
  { en: "Hedgehog", gender: "m", sr: "jež" },
  { en: "Badger", gender: "m", sr: "jazavac" },
  { en: "Deer", gender: "m", sr: "jelen" },
  { en: "Rabbit", gender: "m", sr: "zec" },
  { en: "Squirrel", gender: "f", sr: "veverica" },
  { en: "Beaver", gender: "m", sr: "dabar" },
  { en: "Lynx", gender: "m", sr: "ris" },
  { en: "Heron", gender: "f", sr: "čaplja" },
  { en: "Swan", gender: "m", sr: "labud" },
  { en: "Falcon", gender: "m", sr: "soko" },
  { en: "Dolphin", gender: "m", sr: "delfin" },
  { en: "Turtle", gender: "f", sr: "kornjača" },
  { en: "Frog", gender: "f", sr: "žaba" },
  { en: "Bee", gender: "f", sr: "pčela" },
  { en: "Butterfly", gender: "m", sr: "leptir" },
  { en: "Panda", gender: "f", sr: "panda" },
  { en: "Tiger", gender: "m", sr: "tigar" },
  { en: "Lion", gender: "m", sr: "lav" },
  { en: "Eagle", gender: "m", sr: "orao" },
];

// `author`: the sender's key for the course, in hex.
export function generatedBoardName(author: string, locale: Locale): string {
  const color = COLORS[Number.parseInt(author.slice(0, 4), 16) % COLORS.length] ?? COLORS[0];
  const animal = ANIMALS[Number.parseInt(author.slice(4, 8), 16) % ANIMALS.length] ?? ANIMALS[0];
  if (locale === "en") return `${color.en} ${animal.en}`;
  const latin = `${color.sr[animal.gender]} ${animal.sr}`;
  return locale === "sr-Cyrl" ? transliterateSerbianLatinToCyrillic(latin) : latin;
}

// The name a message shows: what its sender typed, else the generated one.
export function boardDisplayName(message: { author: string; name: string }, locale: Locale): string {
  return message.name.trim() || generatedBoardName(message.author, locale);
}
