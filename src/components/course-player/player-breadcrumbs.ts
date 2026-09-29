import { FileText, Folder } from "lucide-react";

import type { CoursePlayerReadyState } from "@/components/course-player/use-course-player";
import type { PageBreadcrumb } from "@/components/page/page-breadcrumbs";

// The lesson player's trail: Course › Section › Lesson. The course crumb goes
// back to the course details page; in the draft editor's previews the section
// is synthetic and the course isn't a published details page, so the trail is
// just Course › Lesson with nothing to click. (The test player shows no trail.)
export function buildPlayerBreadcrumbs(
  playerState: CoursePlayerReadyState,
  itemTitle: string,
): PageBreadcrumb[] {
  const item: PageBreadcrumb = { icon: FileText, label: itemTitle };

  if (playerState.isPreview) {
    return [{ icon: Folder, label: playerState.courseTitle }, item];
  }

  return [
    { icon: Folder, label: playerState.courseTitle, to: `/courses/${playerState.courseId}` },
    { icon: Folder, label: playerState.sectionTitle },
    item,
  ];
}
