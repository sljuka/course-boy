import { Fragment, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, BookOpen, Star } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { CourseDetails, CourseExercise, CourseLesson } from "@/lib/course-package";
import { evaluateFormula } from "@/lib/formula-dsl";
import { useAppState } from "@/lib/use-app-state";

type DialogStep = "complete" | "exercise" | "lesson";

type ExerciseInstance = {
  expectedAnswer: number;
  variables: Record<string, number>;
};

function renderInlineMarkdown(source: string) {
  const parts = source.split(/(\*\*.*?\*\*)/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold text-stone-950">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
  });
}

function LessonMarkdown({ source }: { source: string }) {
  const blocks = source
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="flex flex-col gap-4 text-base leading-7 text-stone-700">
      {blocks.map((block, index) => {
        const lines = block.split("\n");
        const firstLine = lines[0]?.trim() ?? "";
        const rest = lines.slice(1).join(" ").trim();

        if (firstLine.startsWith("# ")) {
          return (
            <div className="flex flex-col gap-3" key={`${firstLine}-${index}`}>
              <h3 className="text-2xl font-semibold leading-tight text-stone-950">
                {firstLine.replace(/^#\s+/, "")}
              </h3>
              {rest ? <p>{renderInlineMarkdown(rest)}</p> : null}
            </div>
          );
        }

        return <p key={`${block}-${index}`}>{renderInlineMarkdown(lines.join(" "))}</p>;
      })}
    </div>
  );
}

function interpolateTemplate(
  template: string,
  variables: Record<string, number>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, variableName: string) => {
    return String(variables[variableName] ?? "");
  });
}

function roundToPrecision(value: number, precision: number): number {
  const multiplier = 10 ** precision;

  return Math.round(value * multiplier) / multiplier;
}

function buildExerciseInstance(exercise: CourseExercise): ExerciseInstance {
  const variables = Object.fromEntries(
    Object.entries(exercise.variables).map(([variableName, variableDefinition]) => {
      const span = variableDefinition.max - variableDefinition.min + 1;
      const randomValue = Math.floor(Math.random() * span) + variableDefinition.min;

      return [variableName, randomValue];
    }),
  );
  const expectedAnswer = roundToPrecision(
    evaluateFormula(exercise.formula, variables),
    exercise.precision,
  );

  return {
    expectedAnswer,
    variables,
  };
}

export const CourseDetailPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { locale } = useAppState();
  const { t } = useTranslation();
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [dialogStep, setDialogStep] = useState<DialogStep>("lesson");
  const [exerciseAnswer, setExerciseAnswer] = useState("");
  const [exerciseFeedback, setExerciseFeedback] = useState<string | null>(null);
  const [isExercisePassed, setIsExercisePassed] = useState(false);
  const [exerciseInstance, setExerciseInstance] = useState<ExerciseInstance | null>(null);

  const lessonSequence = useMemo(() => {
    if (!course) {
      return [];
    }

    return course.sections.flatMap((section) =>
      section.lessons.map((lesson) => ({
        lesson,
        sectionId: section.id,
        sectionTitle: section.title,
      })),
    );
  }, [course]);

  const activeLessonEntry = lessonSequence[activeLessonIndex] ?? null;
  const activeLesson = activeLessonEntry?.lesson ?? null;

  useEffect(() => {
    let isMounted = true;

    if (!courseId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setIsFavorite(false);
    setIsCourseDialogOpen(false);
    setActiveLessonIndex(0);
    setDialogStep("lesson");
    setExerciseAnswer("");
    setExerciseFeedback(null);
    setIsExercisePassed(false);
    setExerciseInstance(null);

    window.courses
      .get(courseId, locale)
      .then((nextCourse) => {
        if (!isMounted) {
          return;
        }

        setCourse(nextCourse);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setErrorMessage(t("courseDetails.error"));
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [courseId, locale, t]);

  function resetExerciseState() {
    setExerciseAnswer("");
    setExerciseFeedback(null);
    setIsExercisePassed(false);
    setExerciseInstance(null);
  }

  function openCourseDialog() {
    if (!course) {
      return;
    }

    const firstLessonIndex = lessonSequence.findIndex(
      (entry) => entry.sectionId === course.entrySectionId,
    );

    setActiveLessonIndex(firstLessonIndex >= 0 ? firstLessonIndex : 0);
    setDialogStep("lesson");
    resetExerciseState();
    setIsCourseDialogOpen(true);
  }

  function closeCourseDialog() {
    setIsCourseDialogOpen(false);
    setDialogStep("lesson");
    resetExerciseState();
  }

  function moveToNextLesson() {
    if (activeLessonIndex + 1 >= lessonSequence.length) {
      setDialogStep("complete");
      resetExerciseState();
      return;
    }

    setActiveLessonIndex((currentValue) => currentValue + 1);
    setDialogStep("lesson");
    resetExerciseState();
  }

  function continueFromLesson(lesson: CourseLesson | null) {
    if (!lesson) {
      return;
    }

    if (!lesson.exercise) {
      moveToNextLesson();
      return;
    }

    setExerciseInstance(buildExerciseInstance(lesson.exercise));
    setDialogStep("exercise");
    setExerciseAnswer("");
    setExerciseFeedback(null);
    setIsExercisePassed(false);
  }

  function submitExercise(lesson: CourseLesson | null) {
    if (!lesson?.exercise || !exerciseInstance) {
      return;
    }

    const normalizedAnswer = exerciseAnswer.trim();

    if (!normalizedAnswer) {
      setExerciseFeedback(t("courseDetails.enterAnswer"));
      return;
    }

    const parsedAnswer = Number(normalizedAnswer.replace(",", "."));

    if (Number.isNaN(parsedAnswer)) {
      setExerciseFeedback(t("courseDetails.enterAnswer"));
      return;
    }

    const roundedAnswer = roundToPrecision(parsedAnswer, lesson.exercise.precision);

    if (roundedAnswer === exerciseInstance.expectedAnswer) {
      setExerciseFeedback(t("courseDetails.correctAnswer"));
      setIsExercisePassed(true);
      return;
    }

    setExerciseFeedback(
      lesson.exercise.hint
        ? t("courseDetails.incorrectAnswerWithHint", { hint: lesson.exercise.hint })
        : t("courseDetails.incorrectAnswer"),
    );
  }

  if (!courseId) {
    return <Navigate replace to="/" />;
  }

  return (
    <div className="flex w-full max-w-7xl flex-col gap-8 self-center">
      <div className="px-2">
        <Link
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
          to="/"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          {t("courseDetails.back")}
        </Link>
      </div>

      {isLoading ? (
        <Card className="overflow-hidden">
          <CardContent className="py-10 text-sm text-stone-600">
            {t("courseDetails.loading")}
          </CardContent>
        </Card>
      ) : errorMessage ? (
        <Card className="overflow-hidden">
          <CardContent className="py-10 text-sm text-rose-700">
            {errorMessage}
          </CardContent>
        </Card>
      ) : !course ? (
        <Card className="overflow-hidden">
          <CardContent className="py-10 text-sm text-stone-600">
            {t("courseDetails.missing")}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-3 px-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <CardTitle className="text-3xl">{course.title}</CardTitle>
                <span className="text-sm text-stone-500">
                  {t("courseSearch.version", { version: course.version })}
                </span>
              </div>
              <div className="flex items-center gap-3 sm:justify-end">
                <Button onClick={openCourseDialog} size="sm" variant="default">
                  {t("courseDetails.startCourse")}
                </Button>
                <Button
                  aria-label={t(
                    isFavorite ? "removeFavoriteCourse" : "favoriteCourse",
                  )}
                  className="!w-10 shrink-0 rounded-full px-0"
                  onClick={() => setIsFavorite((currentValue) => !currentValue)}
                  size="sm"
                  variant={isFavorite ? "default" : "secondary"}
                >
                  <Star
                    aria-hidden="true"
                    className={isFavorite ? "h-5 w-5 fill-current" : "h-5 w-5"}
                  />
                </Button>
              </div>
            </div>
            <CardDescription className="max-w-3xl text-base text-stone-700">
              {course.description}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-4">
            {course.sections.map((section) => (
              <Card
                className="overflow-hidden border-stone-200/80 bg-stone-50/80 shadow-none"
                id={section.id}
                key={section.id}
              >
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="text-base font-semibold text-stone-900">
                      {section.title}
                    </div>
                    {section.description ? (
                      <CardDescription className="text-sm text-stone-600">
                        {section.description}
                      </CardDescription>
                    ) : null}
                  </div>
                  <div className="overflow-x-auto pb-2">
                    <div className="flex min-w-max gap-3">
                      {section.lessons.map((lesson) => (
                        <div
                          className="flex flex-col items-center gap-2"
                          key={lesson.id}
                        >
                          <div
                            className={buttonVariants({
                              appearance: "squareTileMd",
                              variant: "secondary",
                            })}
                          >
                            {lesson.iconUrl ? (
                              <img
                                alt=""
                                className="h-12 w-12 object-contain"
                                src={lesson.iconUrl}
                              />
                            ) : (
                              <BookOpen
                                aria-hidden="true"
                                className="h-12 w-12 text-stone-700"
                              />
                            )}
                          </div>
                          <span className="max-w-32 text-center text-sm font-semibold text-stone-900">
                            {lesson.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Dialog onOpenChange={setIsCourseDialogOpen} open={isCourseDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <div className="flex min-w-0 flex-col gap-2">
                  <DialogTitle>{course.title}</DialogTitle>
                  {activeLessonEntry ? (
                    <DialogDescription className="text-base">
                      {activeLessonEntry.sectionTitle}
                      {" · "}
                      {t("courseDetails.progress", {
                        current: activeLessonIndex + 1,
                        total: lessonSequence.length,
                      })}
                    </DialogDescription>
                  ) : null}
                </div>
                <DialogClose
                  aria-label={t("courseDetails.closeCourse")}
                  className="shrink-0"
                  onClick={closeCourseDialog}
                />
              </DialogHeader>
              <DialogBody>
                {dialogStep === "complete" ? (
                  <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                    <h3 className="text-3xl font-semibold text-stone-950">
                      {t("courseDetails.completedTitle")}
                    </h3>
                    <p className="max-w-2xl text-base leading-7 text-stone-600">
                      {t("courseDetails.completedDescription")}
                    </p>
                    <Button onClick={closeCourseDialog} size="lg" variant="default">
                      {t("courseDetails.closeCourse")}
                    </Button>
                  </div>
                ) : activeLesson ? (
                  <div className="flex flex-col gap-6">
                    <Card className="overflow-hidden border-stone-200/80 bg-white/85 shadow-none">
                      <CardContent className="flex flex-col gap-6">
                        {dialogStep === "lesson" ? (
                          <>
                            <LessonMarkdown source={activeLesson.body} />
                            <div className="flex justify-end">
                              <Button
                                onClick={() => continueFromLesson(activeLesson)}
                                size="lg"
                                variant="default"
                              >
                                {t("continue")}
                              </Button>
                            </div>
                          </>
                        ) : activeLesson.exercise && exerciseInstance ? (
                          <>
                            <div className="flex flex-col gap-2">
                              <h3 className="text-2xl font-semibold text-stone-950">
                                {activeLesson.exercise.title}
                              </h3>
                              <p className="text-base leading-7 text-stone-700">
                                {renderInlineMarkdown(
                                  interpolateTemplate(
                                    activeLesson.exercise.prompt,
                                    exerciseInstance.variables,
                                  ),
                                )}
                              </p>
                            </div>
                            <div className="flex max-w-xs flex-col gap-3">
                              <label
                                className="text-sm font-medium text-stone-700"
                                htmlFor="course-exercise-answer"
                              >
                                {t("courseDetails.answerLabel")}
                              </label>
                              <Input
                                id="course-exercise-answer"
                                onChange={(event) => setExerciseAnswer(event.target.value)}
                                placeholder={t("courseDetails.answerPlaceholder")}
                                value={exerciseAnswer}
                              />
                            </div>
                            {exerciseFeedback ? (
                              <div
                                className={
                                  isExercisePassed
                                    ? "text-sm font-medium text-emerald-700"
                                    : "text-sm font-medium text-rose-700"
                                }
                              >
                                {exerciseFeedback}
                              </div>
                            ) : null}
                            <div className="flex justify-end">
                              <Button
                                onClick={() =>
                                  isExercisePassed
                                    ? moveToNextLesson()
                                    : submitExercise(activeLesson)
                                }
                                size="lg"
                                variant="default"
                              >
                                {isExercisePassed
                                  ? t("continue")
                                  : t("courseDetails.checkAnswer")}
                              </Button>
                            </div>
                          </>
                        ) : null}
                      </CardContent>
                    </Card>
                  </div>
                ) : null}
              </DialogBody>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};
