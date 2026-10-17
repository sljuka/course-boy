// Links to course content that stay valid when the app's own routes change
// (SLJ-60): written into lessons, copied with "Copy link", resolved here.
//
//   matko://course/<courseId>                     a course's page
//   matko://course/<courseId>/lesson/<lessonId>   a lesson in that course
//   matko://lesson/<lessonId>                     a lesson in the course it's
//                                                 written in
//   matko://program/<programId>                   a program's page
//   matko://channel/<programId>                   a channel's page
//
// The scheme matches APP_LINK_SCHEME in electron/window-security.ts, which
// hands every such link the window tries to open over to the app instead of
// leaving it to the system. Share links that import a course (SLJ-8) will
// use the same scheme with their own path.

import { isValidCourseId } from "@/lib/course-id";

export const APP_LINK_SCHEME = "matko:";

export type AppLink =
  | { courseId: string; kind: "course" }
  | { courseId: string | null; kind: "lesson"; lessonId: string }
  | { kind: "channel"; programId: string }
  | { kind: "program"; programId: string };

// A lesson id: lowercase letters, digits and dashes ("lesson-01-welcome").
const LESSON_ID = /^[a-z0-9][a-z0-9-]{0,127}$/;

export function isAppLink(href: string): boolean {
  return href.trim().toLowerCase().startsWith(`${APP_LINK_SCHEME}//`);
}

export function parseAppLink(href: string): AppLink | null {
  if (!isAppLink(href)) return null;
  const path = href.trim().slice(`${APP_LINK_SCHEME}//`.length).replace(/[?#].*$/, "").replace(/\/+$/, "");
  const parts = path.split("/").map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return "";
    }
  });
  const [first, second, third, fourth] = parts;

  if (parts.length === 2 && first === "lesson" && LESSON_ID.test(second)) {
    return { courseId: null, kind: "lesson", lessonId: second };
  }
  // Program ids are made like course ids (`isValidProgramId`).
  if ((first === "program" || first === "channel") && parts.length === 2 && isValidCourseId(second)) {
    return first === "program" ? { kind: "program", programId: second } : { kind: "channel", programId: second };
  }
  if (first !== "course" || !isValidCourseId(second)) return null;
  if (parts.length === 2) return { courseId: second, kind: "course" };
  if (parts.length === 4 && third === "lesson" && LESSON_ID.test(fourth)) {
    return { courseId: second, kind: "lesson", lessonId: fourth };
  }
  return null;
}

export function courseAppLink(courseId: string): string {
  return `${APP_LINK_SCHEME}//course/${courseId}`;
}

export function lessonAppLink(courseId: string, lessonId: string): string {
  return `${APP_LINK_SCHEME}//course/${courseId}/lesson/${lessonId}`;
}

export function programAppLink(programId: string, kind: "channel" | "program" = "program"): string {
  return `${APP_LINK_SCHEME}//${kind}/${programId}`;
}

// The course a page belongs to, for a link without one: the player and the
// course page (`/courses/<id>…`) or the editor (`/drafts/<id>`).
export function courseIdOfPath(pathname: string): string | null {
  const match = /^\/(?:courses|drafts)\/([^/?#]+)/.exec(pathname);
  return match && match[1] !== "new" ? decodeURIComponent(match[1]) : null;
}

// Where a link goes in the app. `course`: the linked course as it is on
// this device (its lesson ids), or null when it isn't here; a lesson that
// isn't in it opens the course's page. In the editor, a lesson of the
// course being edited opens there. A program or channel opens its page,
// which says when it can't be opened.
export function appLinkPath(
  link: AppLink,
  {
    course,
    currentPath,
  }: { course: { lessonIds: readonly string[] } | null; currentPath: string },
): string | null {
  if (link.kind === "program") return `/programs/${link.programId}`;
  if (link.kind === "channel") return `/channels/${link.programId}`;
  const courseId = link.courseId ?? courseIdOfPath(currentPath);
  if (!courseId) return null;
  if (!course) return `/courses/${courseId}`;
  if (link.kind === "course" || !course.lessonIds.includes(link.lessonId)) return `/courses/${courseId}`;

  const isEditingThisCourse = currentPath.startsWith(`/drafts/${courseId}`);
  if (isEditingThisCourse) return `/drafts/${courseId}?node=${encodeURIComponent(`document:${link.lessonId}`)}`;
  return `/courses/${courseId}/lessons/${link.lessonId}`;
}
