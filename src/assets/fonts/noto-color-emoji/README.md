# Noto Color Emoji (COLRv1)

The app's emoji font (`src/index.css`): every emoji, flags included, drawn the
same on every computer.

- Source: [googlefonts/noto-emoji](https://github.com/googlefonts/noto-emoji),
  `2D/fonts/Noto-COLRv1.ttf` at commit `1ffdd21391dd1f25c081fa93a9dea0c7c029442b`
  (2026-09-17, "Add Emoji 18 fonts").
- SHA-256: `b8e25ea68db82f9e4d0aee921f4420be2be39887bd5c893a2ad98710531f9d0c`
- License: SIL Open Font License 1.1 ([OFL.txt](OFL.txt)).

Why this file and not `@fontsource/noto-color-emoji`: that package's fonts are
OpenType-SVG, which Chromium (so Electron) can't draw: every emoji came out
blank. This one is COLRv1, which Chromium draws since version 98, and half the
size of the bitmap `NotoColorEmoji.ttf`.

To update: download the file at a newer commit, check that its `COLR` table is
version 1, and update the commit and checksum here.
