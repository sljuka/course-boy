import { BookOpen } from "lucide-react";

// The `/` menu's "Link to a lesson": writes the chosen lesson's title as a
// link where the cursor is.
export function createLessonLinkSlashMenuItem({
  onClick,
  subtext,
  title,
}: {
  onClick: () => void;
  subtext: string;
  title: string;
}) {
  return {
    aliases: ["link", "lesson", "lekcija", "veza", "лекција", "веза"],
    // The exercise item's group (exercise-block.tsx): content of this course.
    group: "Course",
    icon: <BookOpen size={18} />,
    onItemClick: onClick,
    subtext,
    title,
  };
}
