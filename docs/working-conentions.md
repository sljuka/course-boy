# Working Conventions

- Read [persistence-notes.md](docs/persistence-notes.md:1) when making decisions about draft storage, publishing, local state, or future sharing architecture.
- Treat Matko as a course sharing app, not just a local course player/editor.
- Courses are stored locally today, but the architecture should stay compatible with future peer-to-peer sharing.
- Prefer portable course-package logic and avoid coupling core course behavior to device-local assumptions when that would make future sharing harder.
- Write code as if the project will be maintained by outside contributors after open sourcing.
- Favor clarity, explicitness, and maintainability over clever shortcuts.
- Keep files, component boundaries, and naming readable enough that a new contributor can understand the codebase without tribal knowledge.
- When making structural decisions, prefer patterns that scale cleanly as authoring, local storage, and sharing features grow.
- Use the design-system components from `src/components/ui` first.
- Do not add page-specific or feature-specific styling unless it is layout-only.
- Layout-only styling means things like `flex`, `gap`, `flex-col`, `grid`, width constraints, and spacing needed to place components.
- Keep visual styling such as backgrounds, colors, borders, shadows, radius, typography, and interaction states inside shared `ui` components.
- When shared visual behavior needs multiple looks, use `cva` variants instead of ad-hoc per-page class stacks.
- Avoid large files, especially in `src/components/ui`. Prefer not to let UI files grow past roughly 150 LOC.
- Prefer React composition over monolithic components.
- Prefer hooks to extract stateful or repeated behavior.
- When a component starts mixing multiple responsibilities, split it into smaller components or hooks.
