import type { BlockNoteEditor } from "@blocknote/core";
import { createReactBlockSpec, useBlockNoteEditor } from "@blocknote/react";
import { History } from "lucide-react";

import { TimelinePointFields } from "@/components/editor-prototype/timeline-point-fields";
import { parseTimelineMarker, serializeTimelineMarker } from "@/lib/lesson-timeline";

// A point on the lesson's timeline (SLJ-35), placed where the lesson reaches
// that moment. The teacher fills it in here; students see nothing in the
// text, only the bar at the top of the lesson moving to it
// (course-player/lesson-timeline.tsx finds it by `data-timeline-marker`).
export const timelineBlockSpec = createReactBlockSpec(
  {
    type: "timeline",
    propSchema: { data: { default: "" } },
    content: "none",
  },
  {
    // Named function expression so the react-hooks lint rule treats it as a
    // component (same as `exercise-block.tsx`).
    render: function TimelineBlockRenderer(props) {
      const editor = useBlockNoteEditor();
      const marker = parseTimelineMarker(props.block.props.data) ?? { label: "" };

      if (!editor.isEditable) {
        return <div aria-hidden="true" className="h-0" data-timeline-marker="" />;
      }

      return (
        <TimelinePointFields
          marker={marker}
          onChange={(next) => editor.updateBlock(props.block, { props: { data: serializeTimelineMarker(next) } })}
        />
      );
    },
  },
)();

// The `/` menu's "Timeline point" (same group as Exercise).
export function createTimelineSlashMenuItem(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: BlockNoteEditor<any, any, any>,
  { subtext, title }: { subtext: string; title: string },
) {
  return {
    aliases: ["timeline", "date", "year", "history", "vremenska linija", "godina", "istorija", "временска линија", "година"],
    group: "Course",
    icon: <History size={18} />,
    onItemClick: () => {
      editor.insertBlocks([{ type: "timeline", props: { data: "" } }], editor.getTextCursorPosition().block, "after");
    },
    subtext,
    title,
  };
}
