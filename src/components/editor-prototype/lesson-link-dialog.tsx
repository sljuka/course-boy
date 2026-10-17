import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useComboboxAnchor } from "@/components/ui/use-combobox-anchor";
import { lessonAppLink, thisCourseLessonAppLink } from "@/lib/app-links";
import { useCourseDetailsQuery, useCoursesQuery } from "@/lib/course-queries";
import type { Locale } from "@/lib/i18n";

export type PickedLessonLink = { href: string; title: string };

type LessonOption = { id: string; sectionTitle: string; title: string };

// "Link to a lesson" in the lesson editor (SLJ-60): pick a lesson of this
// course or of another course on this device, instead of typing its
// `matko://` link. A lesson of this course gets a link without the course
// (`matko://lesson/<id>`), so it opens wherever the course is. Titles are in
// `locale`, the language being written. `open` false: closed.
export function LessonLinkDialog({
  courseId,
  locale,
  onOpenChange,
  onPick,
  open,
}: {
  courseId: string;
  locale: Locale;
  onOpenChange: (open: boolean) => void;
  onPick: (link: PickedLessonLink) => void;
  open: boolean;
}) {
  const { t } = useTranslation();
  const [selectedCourseId, setSelectedCourseId] = useState(courseId);
  const { data: courses = [], refetch: refetchCourses } = useCoursesQuery(locale);
  const { data: ownCourse } = useCourseDetailsQuery(courseId, locale);
  const { data: course } = useCourseDetailsQuery(open ? selectedCourseId : undefined, locale);
  const anchor = useComboboxAnchor();

  // Each time it opens: this course again, and the courses on this device as
  // they are now (one imported or made since the editor opened included).
  useEffect(() => {
    if (!open) return;
    setSelectedCourseId(courseId);
    void refetchCourses();
  }, [courseId, open, refetchCourses]);

  // This course first, named from its own details (the list can lag behind a
  // course just made), then the others on this device by title.
  const courseOptions = useMemo(() => {
    const others = courses
      .filter((summary) => summary.id !== courseId)
      .map((summary) => ({ id: summary.id, label: summary.title }))
      .sort((a, b) => a.label.localeCompare(b.label, locale));
    const own = { id: courseId, label: t("lessonLink.thisCourse", { title: ownCourse?.title ?? "" }) };
    return [own, ...others];
  }, [courseId, courses, locale, ownCourse?.title, t]);

  const lessons = useMemo<LessonOption[]>(
    () =>
      (course?.sections ?? []).flatMap((section) =>
        section.lessons.map((lesson) => ({ id: lesson.id, sectionTitle: section.title, title: lesson.title })),
      ),
    [course],
  );
  const lessonsById = useMemo(() => new Map(lessons.map((lesson) => [lesson.id, lesson])), [lessons]);

  function pick(lessonId: string | null) {
    const lesson = lessonId ? lessonsById.get(lessonId) : undefined;
    if (!lesson) return;
    onPick({
      href:
        selectedCourseId === courseId
          ? thisCourseLessonAppLink(lesson.id)
          : lessonAppLink(selectedCourseId, lesson.id),
      title: lesson.title,
    });
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="w-[min(30rem,calc(100vw-2rem))]" data-testid="lesson-link-dialog">
        <DialogHeader>
          <DialogTitle>{t("lessonLink.title")}</DialogTitle>
          <DialogDescription>{t("lessonLink.description")}</DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="lesson-link-course">{t("lessonLink.course")}</FieldLabel>
          <Select onValueChange={(value) => value && setSelectedCourseId(value)} value={selectedCourseId}>
            <SelectTrigger className="w-full" data-testid="lesson-link-course" id="lesson-link-course">
              <SelectValue>
                {(value: string) => courseOptions.find((option) => option.id === value)?.label ?? ""}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {courseOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="lesson-link-search">{t("lessonLink.lesson")}</FieldLabel>
          <Combobox
            filter={(lessonId: string, query) => {
              const lesson = lessonsById.get(lessonId);
              const needle = query.trim().toLocaleLowerCase(locale);
              if (!lesson || !needle) return Boolean(lesson);
              return `${lesson.title} ${lesson.sectionTitle}`.toLocaleLowerCase(locale).includes(needle);
            }}
            items={lessons.map((lesson) => lesson.id)}
            itemToStringLabel={(lessonId: string) => lessonsById.get(lessonId)?.title ?? ""}
            key={selectedCourseId}
            onValueChange={pick}
          >
            <div ref={anchor}>
              <ComboboxInput
                autoFocus
                data-testid="lesson-link-search"
                id="lesson-link-search"
                placeholder={t("lessonLink.searchPlaceholder")}
              />
            </div>
            <ComboboxContent anchor={anchor}>
              <ComboboxEmpty>{course && lessons.length === 0 ? t("lessonLink.noLessons") : t("lessonLink.noMatch")}</ComboboxEmpty>
              <ComboboxList>
                {(lessonId: string) => {
                  const lesson = lessonsById.get(lessonId);
                  if (!lesson) return null;
                  return (
                    <ComboboxItem data-testid="lesson-link-option" key={lesson.id} value={lesson.id}>
                      <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                      <span className="max-w-[45%] shrink-0 truncate text-muted-foreground">{lesson.sectionTitle}</span>
                    </ComboboxItem>
                  );
                }}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </Field>
      </DialogContent>
    </Dialog>
  );
}
