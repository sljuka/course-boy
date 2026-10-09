import { ArrowDown, ArrowUp, BookOpen, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AddCourseByCode } from "@/components/programs/add-course-by-code";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { FieldDescription, FieldLegend, FieldSet } from "@/components/ui/field";
import { ListRow, ListRowActions, ListRowLink, ListRowMeta } from "@/components/ui/list-row";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CourseSummary } from "@/lib/course-package";
import { useCoursesQuery } from "@/lib/course-queries";
import type { Locale } from "@/lib/i18n";
import { getLocaleFlag } from "@/lib/locale-flags";
import { localizeProgram, type ProgramCourse, type ProgramCourseSnapshot } from "@/lib/program-package";

// The program's courses, in order (SLJ-32): add one of your own courses, or
// anyone's by its code (looked up online), move it up or down, or take it out.
// Each keeps a snapshot of the course's titles and descriptions, so the
// program's page shows it before it's imported. One of your courses not
// published yet gets its code when the program is published, if the course
// has one by then; until then students can't get it.
export function ProgramCoursesEditor({
  courses,
  locale,
  onChange,
}: {
  courses: ProgramCourse[];
  locale: Locale;
  onChange: (courses: ProgramCourse[]) => void;
}) {
  const { t } = useTranslation();
  const { data: allCourses = [] } = useCoursesQuery(locale);
  const [isAdding, setIsAdding] = useState(false);
  const ownCourses = allCourses.filter((course) => course.distribution === "local");
  const addable = ownCourses.filter((course) => !courses.some((entry) => entry.courseId === course.id));
  // Your courses with a published version: they'll have a code by Publish.
  const publishedCourseIds = new Set(ownCourses.filter((course) => course.publishedVersion).map((course) => course.id));

  function move(index: number, by: -1 | 1) {
    const next = [...courses];
    const [course] = next.splice(index, 1);
    next.splice(index + by, 0, course);
    onChange(next);
  }

  async function add(courseId: string) {
    const course = ownCourses.find((candidate) => candidate.id === courseId);
    if (!course) return;
    setIsAdding(true);
    try {
      onChange([...courses, await courseEntry(course)]);
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <FieldSet>
      <FieldLegend>{t("programs.courses")}</FieldLegend>
      <FieldDescription>{t("programs.coursesHint")}</FieldDescription>
      {courses.length === 0 ? (
        <CardDescription>{t("programs.noCourses")}</CardDescription>
      ) : (
        <ol className="flex flex-col" data-testid="program-courses">
          {courses.map((entry, index) => {
            const { title } = localizeProgram(
              { defaultLocale: entry.snapshot.supportedLocales[0], locales: entry.snapshot.locales },
              locale,
            );
            return (
              <li key={entry.courseId}>
                <ListRow>
                  <ListRowMeta className="w-5">{index + 1}</ListRowMeta>
                  <BookOpen aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                  <ListRowLink render={<span />}>{title || entry.courseId}</ListRowLink>
                  {!entry.code && !publishedCourseIds.has(entry.courseId) && (
                    <ListRowMeta data-testid="program-course-unpublished">
                      {t("programSharing.courseNotPublished")}
                    </ListRowMeta>
                  )}
                  <ListRowMeta>{entry.snapshot.supportedLocales.map(getLocaleFlag).join(" ")}</ListRowMeta>
                  <ListRowActions>
                    <Button
                      aria-label={t("programs.moveUp")}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      size="icon-xs"
                      variant="ghost"
                    >
                      <ArrowUp aria-hidden="true" />
                    </Button>
                    <Button
                      aria-label={t("programs.moveDown")}
                      disabled={index === courses.length - 1}
                      onClick={() => move(index, 1)}
                      size="icon-xs"
                      variant="ghost"
                    >
                      <ArrowDown aria-hidden="true" />
                    </Button>
                    <Button
                      aria-label={t("programs.removeCourse")}
                      onClick={() => onChange(courses.filter((_, other) => other !== index))}
                      size="icon-xs"
                      variant="ghost"
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </ListRowActions>
                </ListRow>
              </li>
            );
          })}
        </ol>
      )}
      <div className="flex flex-col gap-3">
        {addable.length > 0 && (
          <div>
            <Select disabled={isAdding} onValueChange={(value) => value && void add(String(value))} value={null}>
              <SelectTrigger className="w-full sm:w-80" data-testid="program-add-course">
                <SelectValue placeholder={t("programs.addCourse")} />
              </SelectTrigger>
              <SelectContent>
                {addable.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <AddCourseByCode
          existingCourseIds={courses.map((entry) => entry.courseId)}
          onAdd={(course) => onChange([...courses, course])}
        />
      </div>
    </FieldSet>
  );
}

// A course's entry in a program: its code (once it's published) and a
// snapshot of its titles and descriptions in every language it has.
async function courseEntry(course: CourseSummary): Promise<ProgramCourse> {
  const localized = await Promise.all(
    course.supportedLocales.map(async (courseLocale) => {
      const inLocale = (await window.courses.list(courseLocale)).find((candidate) => candidate.id === course.id);
      return [
        courseLocale,
        { description: inLocale?.description ?? "", title: inLocale?.title ?? course.title },
      ] as const;
    }),
  );
  const sharing = await window.sharing.getCourseSharing(course.id).catch(() => null);
  const snapshot: ProgramCourseSnapshot = {
    locales: Object.fromEntries(localized),
    publisherId: null,
    supportedLocales: course.supportedLocales,
    version: course.publishedVersion,
  };
  return { code: sharing?.code ?? null, courseId: course.id, snapshot };
}
