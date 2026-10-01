import type { TFunction } from "i18next";

import type { CourseChange, CourseChangeLocation } from "@/lib/course-package";
import type { Locale } from "@/lib/i18n";
import { getLocaleLabel } from "@/components/draft-details/draft-locale-utils";

// One release-notes line, in the reader's language: changes are stored as data
// (SLJ-27) so a Serbian student reads them in Serbian whatever the author used.
export function describeCourseChange(change: CourseChange, t: TFunction): string {
  switch (change.target) {
    case "section":
      return t(`courseChanges.section.${change.kind}`, { title: change.title });
    case "lesson":
    case "test":
      return t(`courseChanges.${change.target}.${change.kind}`, {
        section: change.section,
        title: change.title,
      });
    case "course":
      return t(`courseChanges.course.${change.field}`);
    case "language":
      return t(`courseChanges.language.${change.kind}`, {
        language: getLocaleLabel(change.locale as Locale, t),
      });
    case "files":
      return t(`courseChanges.files.${change.kind}`, { count: change.count });
  }
}

// Where a missing file is used, e.g. 'lesson "Addition" in "Basics"'.
export function describeCourseLocation(location: CourseChangeLocation, t: TFunction): string {
  switch (location.target) {
    case "course":
      return t("courseChanges.location.course");
    case "section":
      return t("courseChanges.location.section", { title: location.title });
    case "lesson":
    case "test":
      return t(`courseChanges.location.${location.target}`, {
        section: location.section,
        title: location.title,
      });
  }
}
