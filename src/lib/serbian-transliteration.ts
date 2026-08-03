const digraphMap: Record<string, string> = {
  DŽ: "Џ",
  Dž: "Џ",
  dž: "џ",
  LJ: "Љ",
  Lj: "Љ",
  lj: "љ",
  NJ: "Њ",
  Nj: "Њ",
  nj: "њ",
}

const charMap: Record<string, string> = {
  A: "А",
  B: "Б",
  C: "Ц",
  Č: "Ч",
  Ć: "Ћ",
  D: "Д",
  Đ: "Ђ",
  E: "Е",
  F: "Ф",
  G: "Г",
  H: "Х",
  I: "И",
  J: "Ј",
  K: "К",
  L: "Л",
  M: "М",
  N: "Н",
  O: "О",
  P: "П",
  R: "Р",
  S: "С",
  Š: "Ш",
  T: "Т",
  U: "У",
  V: "В",
  Z: "З",
  Ž: "Ж",
  a: "а",
  b: "б",
  c: "ц",
  č: "ч",
  ć: "ћ",
  d: "д",
  đ: "ђ",
  e: "е",
  f: "ф",
  g: "г",
  h: "х",
  i: "и",
  j: "ј",
  k: "к",
  l: "л",
  m: "м",
  n: "н",
  o: "о",
  p: "п",
  r: "р",
  s: "с",
  š: "ш",
  t: "т",
  u: "у",
  v: "в",
  z: "з",
  ž: "ж",
}

export function transliterateSerbianLatinToCyrillic(source: string): string {
  let result = ""
  let index = 0

  while (index < source.length) {
    const digraph = source.slice(index, index + 2)

    if (digraphMap[digraph]) {
      result += digraphMap[digraph]
      index += 2
      continue
    }

    const character = source[index]
    result += charMap[character] ?? character
    index += 1
  }

  return result
}
