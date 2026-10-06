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

## Page structure

Every page (except onboarding) is a `<Page>` ([src/components/page/page.tsx](../src/components/page/page.tsx:1)) rendered inside its route layout's `PagePanel`. It has two rows above its scrolling body:

```
row 1  PageToolbar    breadcrumbs · crumbActions                    (navigation)
row 2  PageActionBar  [left toggle] actionBarStart · actionBarCenter · actions [right toggle]
body   [left panel]   PageBody (the only scroll area)   [right panel]
```

```
<Page
  breadcrumbs={[{ label: t("sidebar.myCourses"), to: "/my-courses" }, { label: course.title }]}
  crumbActions={<Button …>★</Button>}      // row 1, right after the last crumb: actions on the item itself
  actionBarStart={…}                       // row 2, start: view controls (tabs, filters)
  actionBarCenter={…}                      // row 2, centre: optional, e.g. the test stepper
  actions={<Button …>…</Button>}           // row 2, end: the page's actions
  header={<CardTitle …/>}                  // heading block at the top of the scrolling body
>
  …page content…
</Page>
```

Each row shows only when it has something in it.

- **Breadcrumbs** say where the page is; the last crumb is the page itself, and each crumb can carry the `icon` its sidebar/explorer item uses. Earlier crumbs navigate (`to`) or select in place (`onSelect`). Pages pass them explicitly; the course editor's layout supplies its trail through `LayoutBreadcrumbsContext` because its "pages" are explorer selections.
- **Side panels:** a layout can give all its pages in-page side panels through `PageSidePanelsContext` — `left` is the editor's explorer, `right` one card with the course's Versions and Details (the course page's right panel is Details alone). `Page` places them beside the body and puts their toggles at the two ends of the action bar. Each card in a panel is a `PanelCard` (`src/components/ui/panel-card.tsx`): a bordered card with a Linear-style "Title ▾" header that collapses it, and an optional header action. Several sections in one card are `PanelCard variant="section"` inside a `PanelCardGroup`.
- **Action-bar buttons are 28px tall:** text buttons use `size="sm"` (`secondary`, or `default` for the page's primary action), icon buttons use `size="icon-sm" shape="circle" variant="subtle"` — `subtle` shares `secondary`'s fill with a dimmed icon, and shows an active state when it has `aria-pressed`. A text button's label goes in `ButtonLabel`, with the same text as the button's `title`, so on narrow windows it turns into a square icon button with a tooltip (`<Button size="sm" title={label}><Icon /><ButtonLabel>{label}</ButtonLabel></Button>`); every action-bar text button needs an icon for that.
- **Dialog buttons use the normal size** (32px, no `size` prop), in `DialogFooter`: the safe choice first (`secondary`, e.g. Cancel), then the action (`default`, or `destructive` for something that loses work). Only the action bar uses the small size.
- **Page-specific controls go in the action bar** (`actions`, `actionBarStart`, `actionBarCenter`), not in the breadcrumb row or the page body. Row 1 is navigation only, plus `crumbActions` for the item itself.
- **Don't add scroll containers or full-height sizing** — `Page` owns the only scroll area. See docs/contracts.md §9 for the frame and the print rules.
- `PageContent` is the same thing under older prop names (`pageHero`); prefer `Page` for new pages.
