// Links to course content that stay valid when the app's own routes change
// (SLJ-60): written into lessons, copied with "Copy link", resolved here.
//
//   matko://course/<courseId>                     a course's page
//   matko://course/<courseId>/lesson/<lessonId>   a lesson in that course
//   matko://lesson/<lessonId>                     a lesson in the course it's
//                                                 written in
//   matko://program/<programId>                   a program's page
//   matko://channel/<programId>                   a channel's page
//   matko://import/<code>                         Import with the code filled
//                                                 in (SLJ-8); never imports
//                                                 by itself
//
// The scheme matches APP_LINK_SCHEME in electron/window-security.ts and
// electron/app-link-intake.ts: main hands every such link to the window,
// whether clicked in it (SLJ-60) or in another app (SLJ-8).

import { isValidCourseId } from "@/lib/course-id";

export const APP_LINK_SCHEME = "matko:";

export type AppLink =
  | { courseId: string; kind: "course" }
  | { courseId: string | null; kind: "lesson"; lessonId: string }
  | { kind: "channel"; programId: string }
  | { kind: "program"; programId: string }
  | { code: string; kind: "import" };

// A lesson id: lowercase letters, digits and dashes ("lesson-01-welcome").
const LESSON_ID = /^[a-z0-9][a-z0-9-]{0,127}$/;

// A course's or program's code: its key, as z-base-32 (52 characters, what
// Share shows) or hex (64).
const SHARE_CODE = /^(?:[ybndrfg8ejkmcpqxot1uwisza345h769]{52}|[0-9a-f]{64})$/;

export function isShareCode(code: string): boolean {
  return SHARE_CODE.test(code);
}

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

  if (first === "import" && parts.length === 2) {
    const code = second.toLowerCase();
    return isShareCode(code) ? { code, kind: "import" } : null;
  }

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

// A lesson of the course the link is written in. It names no course, so it
// opens in whichever course shows it.
export function thisCourseLessonAppLink(lessonId: string): string {
  return `${APP_LINK_SCHEME}//lesson/${lessonId}`;
}

export function importAppLink(code: string): string {
  return `${APP_LINK_SCHEME}//import/${code}`;
}

export function programAppLink(programId: string, kind: "channel" | "program" = "program"): string {
  return `${APP_LINK_SCHEME}//${kind}/${programId}`;
}

// Of the links that arrived together, the one to open: the newest that is a
// link at all (SLJ-151). One click is one page: a burst of links (a page
// firing the link over and over, or several clicked while onboarding showed)
// never flickers through pages or leaves them in Back. Each request's url
// comes from outside the app, so it's checked here before anything uses it.
export function newestAppLink<T extends { newTab: boolean; url: string }>(
  requests: readonly T[],
): { link: AppLink; newTab: boolean } | null {
  for (let index = requests.length - 1; index >= 0; index -= 1) {
    const link = parseAppLink(requests[index].url);
    if (link) return { link, newTab: requests[index].newTab };
  }
  return null;
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
  if (link.kind === "import") return `/?import=${link.code}`;
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
