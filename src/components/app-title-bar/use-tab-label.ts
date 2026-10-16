import {
  BookOpen,
  CheckCheck,
  Contact,
  FileText,
  FlaskConical,
  Home,
  Library,
  type LucideIcon,
  PencilLine,
  Plus,
  Radio,
  Settings,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { matchPath } from "react-router-dom";

import { useCourseDetailsQuery, useCoursesQuery } from "@/lib/course-queries";
import type { Locale } from "@/lib/i18n";
import { localizeProgram } from "@/lib/program-package";
import { useProgramQuery } from "@/lib/program-queries";
import { useAppState } from "@/lib/use-app-state";

type Match =
  | { kind: "page"; icon: LucideIcon; labelKey: string }
  | { courseId: string; kind: "course"; icon: LucideIcon }
  | { courseId: string; kind: "lesson"; icon: LucideIcon; lessonId: string }
  | { kind: "program"; icon: LucideIcon; programId: string };

// Fixed pages first: `/courses/:courseId` would otherwise swallow `/courses/new`.
const pages: { icon: LucideIcon; labelKey: string; pattern: string }[] = [
  { icon: Home, labelKey: "sidebar.home", pattern: "/" },
  { icon: Settings, labelKey: "menu.settings", pattern: "/settings" },
  { icon: Contact, labelKey: "sidebar.publishers", pattern: "/publishers" },
  { icon: BookOpen, labelKey: "sidebar.myCourses", pattern: "/my-courses" },
  { icon: Library, labelKey: "sidebar.myPrograms", pattern: "/my-programs" },
  { icon: Radio, labelKey: "sidebar.myChannel", pattern: "/my-channel" },
  { icon: CheckCheck, labelKey: "sidebar.approvals", pattern: "/approvals/*" },
  { icon: Plus, labelKey: "sidebar.createCourse", pattern: "/courses/new" },
];

function matchTabPath(path: string): Match | null {
  const pathname = path.split("?")[0];
  for (const page of pages) {
    if (matchPath(page.pattern, pathname)) return { icon: page.icon, kind: "page", labelKey: page.labelKey };
  }
  for (const pattern of ["/courses/:courseId/lessons/:lessonId/test", "/courses/:courseId/lessons/:lessonId"]) {
    const params = matchPath(pattern, pathname)?.params;
    if (params?.courseId && params.lessonId) {
      const icon = pattern.endsWith("/test") ? FlaskConical : FileText;
      return { courseId: params.courseId, icon, kind: "lesson", lessonId: params.lessonId };
    }
  }
  const draft = matchPath("/drafts/:courseId/*", pathname)?.params.courseId;
  if (draft) return { courseId: draft, icon: PencilLine, kind: "course" };
  const course = matchPath("/courses/:courseId", pathname)?.params.courseId;
  if (course) return { courseId: course, icon: BookOpen, kind: "course" };
  for (const pattern of ["/programs/:programId", "/channels/:programId", "/my-programs/:programId"]) {
    const programId = matchPath(pattern, pathname)?.params.programId;
    if (programId) return { icon: pattern.startsWith("/channels") ? Radio : Library, kind: "program", programId };
  }
  return null;
}

// A tab's icon and title (SLJ-12): the page's name for fixed pages, the
// course's for a course page or its editor, the lesson's or test's in the
// players, the program's or channel's. Empty while a name is loading.
export function useTabLabel(path: string): { icon: LucideIcon; label: string } {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const match = matchTabPath(path);
  const courseId = match && (match.kind === "course" || match.kind === "lesson") ? match.courseId : undefined;
  const { data: courses } = useCoursesQuery(locale as Locale);
  const { data: details } = useCourseDetailsQuery(match?.kind === "lesson" ? courseId : undefined, locale as Locale);
  const { data: program } = useProgramQuery(match?.kind === "program" ? match.programId : undefined);

  if (!match) return { icon: FileText, label: t("titleBar.untitledTab") };
  if (match.kind === "page") return { icon: match.icon, label: t(match.labelKey) };
  if (match.kind === "program") {
    return { icon: match.icon, label: program ? localizeProgram(program, locale as Locale).title : "" };
  }
  const courseTitle = courses?.find((course) => course.id === match.courseId)?.title ?? "";
  if (match.kind === "lesson") {
    const lesson = details?.sections.flatMap((section) => section.lessons).find((item) => item.id === match.lessonId);
    return { icon: match.icon, label: lesson?.title ?? courseTitle };
  }
  return { icon: match.icon, label: courseTitle };
}
