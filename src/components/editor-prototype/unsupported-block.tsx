import { useTranslation } from "react-i18next";
import { createReactBlockSpec, useBlockNoteEditor } from "@blocknote/react";
import { CircleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Holds an `UnknownBlock` (see `editor-prototype-types.ts`) while a lesson is
// open in BlockNote: a block this app version can't read, carried through
// untouched in its props so saving writes it back exactly as it was. Not in
// the slash menu; it only ever comes from a lesson written by a newer version.
export const unsupportedBlockSpec = createReactBlockSpec(
  {
    type: "unsupported",
    propSchema: { blockType: { default: "" }, source: { default: "" } },
    content: "none",
  },
  {
    // Named function expression so the react-hooks lint rule treats it as a
    // component (same as `exercise-block.tsx`).
    render: function UnsupportedBlockRenderer() {
      const editor = useBlockNoteEditor();
      const { t } = useTranslation();

      // Students see nothing; the lesson-level notice in `LessonBlocks`
      // tells them something is missing.
      if (!editor.isEditable) {
        return null;
      }

      return (
        <Alert contentEditable={false} variant="warning">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>{t("lessonContent.unsupportedBlockTitle")}</AlertTitle>
          <AlertDescription>{t("lessonContent.unsupportedBlockDescription")}</AlertDescription>
        </Alert>
      );
    },
  },
)();
