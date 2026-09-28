import { FileText, FlaskConical, Folder } from "lucide-react";

import type { CoursePlayerReadyState } from "@/components/course-player/use-course-player";
import type { PageBreadcrumb } from "@/components/page/page-breadcrumbs";

// The players' trail: Course › Section › Lesson (› Test). The course crumb
// goes back to the course details page; in the draft editor's previews the
// section is synthetic and the course isn't a published details page, so the
// trail is just Course › item with nothing to click.
export function buildPlayerBreadcrumbs(
  playerState: CoursePlayerReadyState,
  itemTitle: string,
  testLabel?: string,
): PageBreadcrumb[] {
  // A standalone section test has no lesson above it: its own title is the
  // test crumb. A lesson's test sits under the lesson.
  const tail: PageBreadcrumb[] =
    playerState.activeStep.kind === "lesson" && !testLabel
      ? [{ icon: FileText, label: itemTitle }]
      : testLabel
        ? [
            { icon: FileText, label: itemTitle },
            { icon: FlaskConical, label: testLabel },
          ]
        : [{ icon: FlaskConical, label: itemTitle }];

  if (playerState.isPreview) {
    return [{ icon: Folder, label: playerState.courseTitle }, ...tail];
  }

  return [
    { icon: Folder, label: playerState.courseTitle, to: `/courses/${playerState.courseId}` },
    { icon: Folder, label: playerState.sectionTitle },
    ...tail,
  ];
}
