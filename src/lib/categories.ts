import type { Category } from "@/lib/preferences";

export const courses: Array<{
  category: Category;
  descriptionKey: string;
  icon: string;
  items: Array<{
    category: Category;
    icon: string;
    key: string;
    path: string;
  }>;
  key: "serbianElementarySchool" | "preSchool" | "programming";
}> = [
  {
    category: "elementary-school",
    descriptionKey: "serbianElementarySchoolDescription",
    icon: "📘",
    items: [
      {
        category: "elementary-school",
        icon: "🔢",
        key: "numbersTo20",
        path: "/elementary-school/numbers-to-20",
      },
      {
        category: "elementary-school",
        icon: "➕",
        key: "additionAndSubtraction",
        path: "/elementary-school/addition-and-subtraction",
      },
      {
        category: "elementary-school",
        icon: "📏",
        key: "shapesAndMeasurement",
        path: "/elementary-school/shapes-and-measurement",
      },
      {
        category: "elementary-school",
        icon: "↔️",
        key: "compareNumbers",
        path: "/elementary-school/compare-numbers",
      },
      {
        category: "elementary-school",
        icon: "🧮",
        key: "wordProblems",
        path: "/elementary-school/word-problems",
      },
      {
        category: "elementary-school",
        icon: "🕒",
        key: "timeAndCalendar",
        path: "/elementary-school/time-and-calendar",
      },
      {
        category: "elementary-school",
        icon: "🧱",
        key: "patternsAndSequences",
        path: "/elementary-school/patterns-and-sequences",
      },
      {
        category: "elementary-school",
        icon: "🎲",
        key: "mathGames",
        path: "/elementary-school/math-games",
      },
    ],
    key: "serbianElementarySchool",
  },
  {
    category: "pre-school",
    descriptionKey: "preSchoolDescription",
    icon: "🧸",
    items: [
      {
        category: "pre-school",
        icon: "🔤",
        key: "lettersAndSounds",
        path: "/pre-school",
      },
      {
        category: "pre-school",
        icon: "🔢",
        key: "firstNumbers",
        path: "/pre-school",
      },
      {
        category: "pre-school",
        icon: "🎨",
        key: "playAndCreate",
        path: "/pre-school",
      },
      {
        category: "pre-school",
        icon: "🎵",
        key: "rhythmAndSongs",
        path: "/pre-school",
      },
      {
        category: "pre-school",
        icon: "🧩",
        key: "puzzlesAndLogic",
        path: "/pre-school",
      },
      {
        category: "pre-school",
        icon: "🌿",
        key: "natureAndSeasons",
        path: "/pre-school",
      },
      {
        category: "pre-school",
        icon: "🖍️",
        key: "colorsAndShapes",
        path: "/pre-school",
      },
      {
        category: "pre-school",
        icon: "👫",
        key: "socialSkills",
        path: "/pre-school",
      },
    ],
    key: "preSchool",
  },
  {
    category: "other",
    descriptionKey: "programmingDescription",
    icon: "💻",
    items: [
      {
        category: "other",
        icon: "🧠",
        key: "programmingBasics",
        path: "/other",
      },
      {
        category: "other",
        icon: "🧩",
        key: "logicAndAlgorithms",
        path: "/other",
      },
      {
        category: "other",
        icon: "⚙️",
        key: "buildProjects",
        path: "/other",
      },
      {
        category: "other",
        icon: "🎮",
        key: "gameLogic",
        path: "/other",
      },
      {
        category: "other",
        icon: "🖥️",
        key: "webBasics",
        path: "/other",
      },
      {
        category: "other",
        icon: "🤖",
        key: "creativeCoding",
        path: "/other",
      },
      {
        category: "other",
        icon: "📱",
        key: "appThinking",
        path: "/other",
      },
      {
        category: "other",
        icon: "🔍",
        key: "debuggingBasics",
        path: "/other",
      },
    ],
    key: "programming",
  },
];
