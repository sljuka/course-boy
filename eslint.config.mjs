import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { plugin as shadcn } from "@shadcn/lint";
import globals from "globals";

// The old `.eslintrc.cjs` + CLI `--ext ts,tsx` combination only ever linted
// .ts/.tsx files. Flat config has no equivalent of `--ext`: a config with no
// `files` restriction applies to every file `eslint .` walks (e2e/*.mjs,
// scripts/*.mjs, workers/*.cjs, dist-electron output, ...), which is how
// upstream presets below are published. Scope every unscoped preset to
// **/*.{ts,tsx} so the file set linted stays exactly what it was.
const TS_FILES = ["**/*.ts", "**/*.tsx"];

function scopeToTypeScript(config) {
  return (Array.isArray(config) ? config : [config]).map((entry) =>
    entry.files ? entry : { ...entry, files: TS_FILES },
  );
}

export default [
  {
    // "dist"/"dist-electron" are build output, never source — the old
    // `--ext ts,tsx` CLI filtering kept them out implicitly; flat config's
    // file discovery does not, so they must be ignored explicitly.
    ignores: ["dist", "dist-electron"],
  },
  ...scopeToTypeScript(js.configs.recommended),
  ...scopeToTypeScript(tsPlugin.configs["flat/recommended"]),
  ...scopeToTypeScript(reactHooks.configs["recommended-latest"]),
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
    },
    plugins: {
      "react-refresh": reactRefresh,
      shadcn,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // Pure existence/readability checks — no design-system policy choices.
      "shadcn/no-unknown-classes": "error",
      "shadcn/require-static-classes": "error",
      // Catches raw Tailwind palette colors (bg-white, bg-stone-200, ...) on
      // *any* element, including plain divs/spans that no-restyle can't see
      // (it only tracks PascalCase component references) — this is what
      // should have caught the dark-mode "explorer is white" class of bug.
      "shadcn/no-raw-colors": "error",
      // The design-system tiering rule (docs/working-conventions.md), enforced
      // for real: components own their appearance, callers only place them.
      // `spacing` (padding/gap) is promoted to the baseline alongside `layout`
      // — an audit of every real call site (see the plan this was built from)
      // found it's a pervasive, accepted pattern across nearly every
      // component in this codebase, not an exception a few components need.
      // The per-component contracts below open the categories a specific
      // component's slots are genuinely meant to be styled with — informed by
      // that same audit, not guessed.
      "shadcn/no-restyle": [
        "error",
        {
          allow: ["layout", "spacing"],
          contracts: [
            // A generic surface reused across very different pages (empty
            // states, welcome splash, dashed upload-style placeholders) —
            // closer to a styled div than a fixed-appearance component.
            {
              pattern: "^Card$",
              allow: ["layout", "spacing", "color", "shape", "effects"],
            },
            {
              pattern: "^Card(Content|Title|Description|Header|Footer|Action)$",
              allow: ["layout", "spacing", "typography", "color"],
            },
            // The app shell's one sidebar (plus the course-editor's second
            // instance) — a layout region, not a reusable branded component.
            // `page-fade-in` is a real custom animation class (src/index.css)
            // the grammar can't see.
            {
              pattern: "^Sidebar",
              allow: ["layout", "spacing", "shape", "color", "page-fade-in"],
            },
            {
              pattern: "^Button$",
              allow: ["layout", "spacing", "shape", "color", "typography"],
            },
            // Both reused as borderless inline-editable headings/descriptions
            // via `variant="ghost"` — the page still controls the exact
            // typography. Textarea also has the one dark code-editor surface
            // in block-card.tsx, hence color/effects.
            {
              pattern: "^Textarea$",
              allow: ["layout", "spacing", "shape", "color", "typography", "effects"],
            },
            {
              pattern: "^Input$",
              allow: ["layout", "spacing", "typography"],
            },
            {
              pattern: "^Badge$",
              allow: ["layout", "spacing", "typography"],
            },
            // The "remove course" confirmation dialog has a deliberately
            // distinct, more prominent treatment than the default dialog.
            {
              pattern: "^Dialog(Content|Header)$",
              allow: ["layout", "spacing", "shape", "color", "effects"],
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            'JSXExpressionContainer > ConditionalExpression:matches([consequent.type="JSXElement"], [consequent.type="JSXFragment"])[alternate.type="Literal"][alternate.value=null]',
          message:
            "Prefer `condition && <jsx />` over `condition ? <jsx /> : null` — simpler, and the ternary form invites drift when only one branch ever changes.",
        },
      ],
    },
  },
  {
    // Design-system primitives follow the upstream shadcn/base-ui convention of
    // co-exporting a component with its `cva` variants or its context hook via a
    // trailing `export { ... }` block. `allowConstantExport` only understands
    // `export const`, so the rule misfires here. Fast-refresh granularity inside
    // the design system is not worth splitting every primitive in two.
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
      // Per shadcn/lint's own guidance: component directories call their own
      // cva()/tv() variant functions, which this rule cannot resolve at the
      // call site (e.g. `badgeVariants({ variant, shape })`), so it stays on
      // everywhere else but off here.
      "shadcn/require-static-classes": "off",
      // Components style their own internals — no-restyle only governs
      // callers.
      "shadcn/no-restyle": "off",
    },
  },
  {
    // Each exercise kind's descriptor file (docs/contracts.md #8) co-exports its
    // small `AnswerComponent`/`PrintAnswerComponent` React components alongside the
    // final `ExerciseKindEditor` object export — the same co-export shape as the
    // design-system override above, and for the same reason: `allowConstantExport`
    // doesn't recognize an object literal that merely references components as a
    // "constant export", so the rule misfires. Splitting each kind's components
    // into their own file just to satisfy fast-refresh granularity would undo the
    // consolidation this registry exists for.
    files: ["src/components/exercise-kinds/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    // Same shape, same reason as the exercise-kinds override above:
    // `exercise-block.tsx` co-exports a `createReactBlockSpec(...)` result
    // (BlockNote's own registry-entry shape, not a component) alongside the
    // small authoring/player components it wires into that spec's `render`,
    // and `document-editor-context.tsx` co-exports a context Provider
    // component with its `useDocumentEditorContext` hook — a pairing the
    // codebase already treats as one unit (see `use-app-state.ts`/its own
    // Provider). Splitting either apart just for fast-refresh granularity
    // would hurt readability for no real benefit.
    files: [
      "src/components/editor-prototype/exercise-block.tsx",
      "src/components/editor-prototype/document-editor-context.tsx",
    ],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    // Tag's whole point is a fixed palette of named, user-chosen swatches
    // (amber/emerald/rose/sky/stone/teal) defined inside a `cva()` variant
    // map — deliberately raw colors, not theme tokens that should track the
    // app's single light/dark scheme. no-raw-colors' `contracts` can't scope
    // this: component attribution comes from the enclosing JSX element, and
    // these strings live inside a plain object literal with no JSX parent at
    // all, so they resolve to no component and always hit the baseline
    // policy regardless of any `contracts` pattern — a file-level override
    // is the only thing that actually reaches them.
    files: ["src/components/ui/tag.tsx"],
    rules: {
      "shadcn/no-raw-colors": "off",
    },
  },
  {
    // Print output is paper, not a themed screen surface — these render
    // exclusively inside `print:` styles (see docs/persistence-notes.md's
    // print-friendly format goal), so they stay literal black-on-white
    // regardless of the app's light/dark theme, the same reasoning
    // `@media print` in index.css already applies globally.
    files: ["src/components/course-player/print-*.tsx"],
    rules: {
      "shadcn/no-raw-colors": "off",
    },
  },
  {
    // Tier direction (docs/working-conventions.md): the design system is the
    // bottom layer. It may use `@/lib` helpers and other `ui` primitives, but it
    // must never reach up into feature components or pages.
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/pages/*",
                "@/components/*",
                "!@/components/ui",
                "!@/components/ui/**",
              ],
              message:
                "src/components/ui is the bottom layer: it must not import feature components or pages. Move the shared piece into src/components/ui or src/lib instead.",
            },
          ],
        },
      ],
    },
  },
];
