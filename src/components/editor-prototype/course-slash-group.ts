import { i18n } from "@/lib/i18n";

// The `/` menu's group for what Matko adds to a lesson: an exercise, a
// timeline point, a link to a lesson. The menu groups items by this exact
// text, so all three take it from here, in the app's language when the menu
// opens (a group name shared with a built-in item would show its header
// twice, see exercise-block.tsx).
export function courseSlashGroup(): string {
  return i18n.t("slashMenu.courseGroup");
}
