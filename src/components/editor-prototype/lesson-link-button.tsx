import { BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBlockNoteEditor, useComponentsContext, useEditorState } from "@blocknote/react";

// The formatting toolbar's "Link to a lesson", next to BlockNote's own link
// button: turns the selected text into a link to a lesson chosen in
// LessonLinkDialog. Shown, like the link button, only while text is selected.
export function LessonLinkButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editor = useBlockNoteEditor<any, any, any>();
  const Components = useComponentsContext()!;
  const hasSelection = useEditorState({
    editor,
    selector: ({ editor }) => editor.isEditable && !editor.prosemirrorState.selection.empty,
  });

  if (!hasSelection) return null;

  return (
    <Components.FormattingToolbar.Button
      data-testid="lesson-link-button"
      icon={<BookOpen size={16} />}
      label={t("lessonLink.title")}
      mainTooltip={t("lessonLink.title")}
      onClick={onClick}
    />
  );
}
