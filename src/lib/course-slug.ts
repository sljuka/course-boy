const cyrillicToLatinDigraphMap: Record<string, string> = {
  Љ: "Lj",
  љ: "lj",
  Њ: "Nj",
  њ: "nj",
  Џ: "Dž",
  џ: "dž",
}

const cyrillicToLatinCharMap: Record<string, string> = {
  А: "A",
  а: "a",
  Б: "B",
  б: "b",
  В: "V",
  в: "v",
  Г: "G",
  г: "g",
  Д: "D",
  д: "d",
  Ђ: "Đ",
  ђ: "đ",
  Е: "E",
  е: "e",
  Ж: "Ž",
  ж: "ž",
  З: "Z",
  з: "z",
  И: "I",
  и: "i",
  Ј: "J",
  ј: "j",
  К: "K",
  к: "k",
  Л: "L",
  л: "l",
  М: "M",
  м: "m",
  Н: "N",
  н: "n",
  О: "O",
  о: "o",
  П: "P",
  п: "p",
  Р: "R",
  р: "r",
  С: "S",
  с: "s",
  Т: "T",
  т: "t",
  Ћ: "Ć",
  ћ: "ć",
  У: "U",
  у: "u",
  Ф: "F",
  ф: "f",
  Х: "H",
  х: "h",
  Ц: "C",
  ц: "c",
  Ч: "Č",
  ч: "č",
  Ш: "Š",
  ш: "š",
}

export function transliterateSerbianCyrillicToLatin(source: string): string {
  let result = ""

  for (const character of source) {
    result +=
      cyrillicToLatinDigraphMap[character] ??
      cyrillicToLatinCharMap[character] ??
      character
  }

  return result
}

export function slugifyCourseName(value: string): string {
  return transliterateSerbianCyrillicToLatin(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
}

