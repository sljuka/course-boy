import { describe, expect, it } from "vitest";

import {
  detectSerbianScript,
  syncSerbianLocales,
  transliterateSerbianMarkdown,
  transliterateSerbianText,
} from "@/lib/serbian-script";

describe("transliterateSerbianText", () => {
  it("converts Latin to Cyrillic, digraphs included", () => {
    expect(transliterateSerbianText("Ljubav, njiva i džep", "sr")).toBe("Љубав, њива и џеп");
  });

  it("converts Cyrillic to Latin exactly, keeping all-caps words all caps", () => {
    expect(transliterateSerbianText("Љубав, њива и џеп", "sr-Cyrl")).toBe("Ljubav, njiva i džep");
    expect(transliterateSerbianText("ЉУБАВ и Џ", "sr-Cyrl")).toBe("LJUBAV i Dž");
  });

  it("splits digraphs that are really two letters (exceptions list)", () => {
    expect(transliterateSerbianText("nadživeti konjunkcija injekcija", "sr")).toBe(
      "надживети конјункција инјекција",
    );
    // Not an exception just because it contains one: "kanjon" is кањон.
    expect(transliterateSerbianText("kanjon", "sr")).toBe("кањон");
  });

  it("leaves foreign words (q, w, x, y) and the course's keep-as-is words alone", () => {
    expect(transliterateSerbianText("Python i Excel", "sr")).toBe("Python и Excel");
    expect(transliterateSerbianText("Matko i Linux", "sr", { keepAsIs: ["matko"] })).toBe(
      "Matko и Linux",
    );
  });

  it("keeps placeholders, code, links, URLs and file names as written", () => {
    expect(transliterateSerbianText("Koliko je {{ x }} + {{y}}?", "sr")).toBe("Колико је {{ x }} + {{y}}?");
    expect(transliterateSerbianText("Pokreni `npm run dev` sada", "sr")).toBe("Покрени `npm run dev` сада");
    expect(transliterateSerbianText("Vidi [sajt](https://primer.rs/strana) i www.primer.rs", "sr")).toBe(
      "Види [сајт](https://primer.rs/strana) и www.primer.rs",
    );
    expect(transliterateSerbianText("Slika dijagram-0123456789abcdef.svg", "sr")).toBe(
      "Слика dijagram-0123456789abcdef.svg",
    );
    expect(transliterateSerbianText("Piši na ana@skola.rs", "sr")).toBe("Пиши на ana@skola.rs");
  });

  it("keeps word-type markup symbols", () => {
    expect(transliterateSerbianText("Pas{{n}} trči{{g}}", "sr")).toBe("Пас{{n}} трчи{{g}}");
  });
});

describe("transliterateSerbianMarkdown", () => {
  it("copies a block type it doesn't know unchanged", () => {
    const markdown = [
      "[matko-block]: <> (timeline-milestone)",
      '{"label":"Bitka kod Kosova"}',
      "",
      "[matko-block]: <> (markdown)",
      "Tekst.",
    ].join("\n");

    expect(transliterateSerbianMarkdown(markdown, { source: "sr" })).toBe(
      [
        "[matko-block]: <> (timeline-milestone)",
        '{"label":"Bitka kod Kosova"}',
        "",
        "[matko-block]: <> (markdown)",
        "Текст.",
      ].join("\n"),
    );
  });

  it("keeps block markers and fenced code, and converts the prose", () => {
    const markdown = [
      "[matko-block]: <> (heading)",
      "## Uvod",
      "",
      "[matko-block]: <> (markdown)",
      "Tekst sa `kodom`.",
      "```",
      "const broj = 1",
      "```",
      "",
      "[matko-block]: <> (image)",
      '![Dijagram](dijagram-0123456789abcdef.svg "Opis")',
    ].join("\n");

    expect(transliterateSerbianMarkdown(markdown, { source: "sr" })).toBe(
      [
        "[matko-block]: <> (heading)",
        "## Увод",
        "",
        "[matko-block]: <> (markdown)",
        "Текст са `kodom`.",
        "```",
        "const broj = 1",
        "```",
        "",
        "[matko-block]: <> (image)",
        '![Дијаграм](dijagram-0123456789abcdef.svg "Opis")',
      ].join("\n"),
    );
  });

  it("fills an embedded exercise's generated locale and keeps its structure", () => {
    const exercise = {
      kind: "multiple-choice",
      locales: { sr: { options: ["Da", "Ne"], prompt: "Da li je {{x}} paran?" } },
      correctOptionIndexes: [0],
      selectionMode: "single",
      tags: ["osnove"],
    };
    const markdown = `[matko-block]: <> (exercise)\n${JSON.stringify(exercise)}`;
    const [, json] = transliterateSerbianMarkdown(markdown, { source: "sr" }).split("\n");

    expect(JSON.parse(json)).toEqual({
      ...exercise,
      locales: {
        sr: exercise.locales.sr,
        "sr-Cyrl": { options: ["Да", "Не"], prompt: "Да ли је {{x}} паран?" },
      },
    });
  });
});

describe("syncSerbianLocales", () => {
  it("does nothing without a setting", () => {
    const value = { locales: { sr: { title: "Brojevi" } } };

    expect(syncSerbianLocales(value, null)).toBe(value);
  });

  it("fills every per-locale map from the source, overwriting the generated side", () => {
    const test = {
      exercises: [
        {
          kind: "missing-word",
          locales: {
            en: { prompt: "Fill in", text: "The {{a}}", variables: [] },
            sr: {
              prompt: "Popuni",
              text: "Glavni grad je {{grad}}",
              variables: [{ answers: ["Beograd"], matchCase: false, name: "grad" }],
            },
            "sr-Cyrl": { prompt: "старо", text: "старо", variables: [] },
          },
          tags: [],
        },
        {
          kind: "region-marker",
          locales: { sr: { prompt: "Označi" } },
          regions: [{ color: "#fff", id: "r1", labels: { en: "Lake", sr: "Jezero" } }],
        },
      ],
      template: "",
    };

    const synced = syncSerbianLocales(test, { source: "sr" });

    expect(synced.exercises[0].locales["sr-Cyrl"]).toEqual({
      prompt: "Попуни",
      text: "Главни град је {{grad}}",
      variables: [{ answers: ["Београд"], matchCase: false, name: "grad" }],
    });
    expect(synced.exercises[0].locales.en).toEqual(test.exercises[0].locales.en);
    expect(synced.exercises[1].regions?.[0].labels).toEqual({ en: "Lake", sr: "Jezero", "sr-Cyrl": "Језеро" });
  });

  it("generates Latin from Cyrillic", () => {
    expect(syncSerbianLocales({ locales: { "sr-Cyrl": { title: "Бројеви" } } }, { source: "sr-Cyrl" })).toEqual({
      locales: { sr: { title: "Brojevi" }, "sr-Cyrl": { title: "Бројеви" } },
    });
  });
});

describe("detectSerbianScript", () => {
  it("picks the script with more letters, or null with none", () => {
    expect(detectSerbianScript(["Бројеви", "Brojevi i još"])).toBe("sr");
    expect(detectSerbianScript(["Бројеви и разломци", "ok"])).toBe("sr-Cyrl");
    expect(detectSerbianScript(["", "123"])).toBeNull();
  });
});
