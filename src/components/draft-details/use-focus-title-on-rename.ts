import { useEffect } from "react";

// The explorer's Rename (a fresh `renameRequest` on the selection) opens the
// node's editor; this focuses and selects its title field there, in the
// language tab that's showing. Titles are edited per language in the editor,
// so renaming happens where every language is at hand. `fieldIdPrefix` is the
// title inputs' id without the locale, e.g. "draft-section-title-".
export function useFocusTitleOnRename(renameRequest: number | undefined, fieldIdPrefix: string) {
  useEffect(() => {
    if (!renameRequest) {
      return;
    }

    // After the editor (and its tabs) have rendered.
    const frame = requestAnimationFrame(() => {
      const field = document.querySelector<HTMLInputElement>(`input[id^="${fieldIdPrefix}"]`);
      field?.focus();
      field?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [fieldIdPrefix, renameRequest]);
}
