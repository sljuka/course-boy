import { Fragment, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Printer, RotateCw, X } from "lucide-react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CourseDetails, CourseExercise, CourseLesson } from "@/lib/course-package";
import { evaluateFormula } from "@/lib/formula-dsl";
import { useAppState } from "@/lib/use-app-state";

type PlayerStep = "complete" | "exercise" | "lesson";

type ExerciseInstance = {
  expectedAnswer: number;
  variables: Record<string, number>;
};

type ExerciseResult = {
  feedback: string | null;
  isCorrect: boolean;
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

export const CoursePlayerPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { locale } = useAppState();
  const { t } = useTranslation();
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [playerStep, setPlayerStep] = useState<PlayerStep>("lesson");
  const [activeTestExercises, setActiveTestExercises] = useState<CourseExercise[]>([]);
  const [activeTestInstances, setActiveTestInstances] = useState<ExerciseInstance[]>([]);
  const [exerciseAnswers, setExerciseAnswers] = useState<string[]>([]);
  const [exerciseResults, setExerciseResults] = useState<ExerciseResult[]>([]);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);
  const [isTestPassed, setIsTestPassed] = useState(false);
  const [initializedSessionKey, setInitializedSessionKey] = useState<string | null>(null);

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
  const requestedLessonId = searchParams.get("lesson");
  const requestedStep = searchParams.get("step");
  const sessionKey = `${courseId ?? ""}:${locale}:${requestedLessonId ?? ""}:${requestedStep ?? ""}`;

  useEffect(() => {
    let isMounted = true;

    if (!courseId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setCourse(null);
    setActiveLessonIndex(0);
    setPlayerStep("lesson");
    setActiveTestExercises([]);
    setActiveTestInstances([]);
    setExerciseAnswers([]);
    setExerciseResults([]);
    setTestFeedback(null);
    setIsTestPassed(false);
    setInitializedSessionKey(null);

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
    setActiveTestExercises([]);
    setActiveTestInstances([]);
    setExerciseAnswers([]);
    setExerciseResults([]);
    setTestFeedback(null);
    setIsTestPassed(false);
  }

  function shuffleExercises(exercises: CourseExercise[]): CourseExercise[] {
    const nextExercises = [...exercises];

    for (let currentIndex = nextExercises.length - 1; currentIndex > 0; currentIndex -= 1) {
      const randomIndex = Math.floor(Math.random() * (currentIndex + 1));
      const currentExercise = nextExercises[currentIndex];
      nextExercises[currentIndex] = nextExercises[randomIndex];
      nextExercises[randomIndex] = currentExercise;
    }

    return nextExercises;
  }

  function buildTestExerciseSequence(
    lesson: CourseLesson,
  ): CourseExercise[] {
    if (!lesson.test) {
      return [];
    }

    if (!lesson.test.structure || lesson.test.structure.length === 0) {
      return lesson.test.exercises;
    }

    const remainingExercises = [...lesson.test.exercises];
    const selectedExercises: CourseExercise[] = [];

    for (const rule of lesson.test.structure) {
      const matchingExercises = remainingExercises.filter((exercise) =>
        exercise.tags.includes(rule.tag),
      );

      if (matchingExercises.length < rule.count) {
        return lesson.test.exercises;
      }

      const chosenExercises = shuffleExercises(matchingExercises).slice(0, rule.count);

      for (const chosenExercise of chosenExercises) {
        const exerciseIndex = remainingExercises.findIndex(
          (exercise) => exercise.id === chosenExercise.id,
        );

        if (exerciseIndex >= 0) {
          selectedExercises.push(remainingExercises[exerciseIndex]);
          remainingExercises.splice(exerciseIndex, 1);
        }
      }
    }

    return selectedExercises;
  }

  function startLessonTest(lesson: CourseLesson) {
    if (!lesson.test || lesson.test.exercises.length === 0) {
      setPlayerStep("lesson");
      return;
    }

    const selectedExercises = buildTestExerciseSequence(lesson);

    if (selectedExercises.length === 0) {
      setPlayerStep("lesson");
      return;
    }

    setActiveTestExercises(selectedExercises);
    setActiveTestInstances(selectedExercises.map((exercise) => buildExerciseInstance(exercise)));
    setExerciseAnswers(selectedExercises.map(() => ""));
    setExerciseResults(selectedExercises.map(() => ({ feedback: null, isCorrect: false })));
    setTestFeedback(null);
    setIsTestPassed(false);
    setPlayerStep("exercise");
  }

  useEffect(() => {
    if (!course || lessonSequence.length === 0 || initializedSessionKey === sessionKey) {
      return;
    }

    const defaultLessonIndex = lessonSequence.findIndex(
      (entry) => entry.sectionId === course.entrySectionId,
    );
    const requestedLessonIndex = requestedLessonId
      ? lessonSequence.findIndex((entry) => entry.lesson.id === requestedLessonId)
      : -1;
    const nextLessonIndex = requestedLessonIndex >= 0
      ? requestedLessonIndex
      : defaultLessonIndex >= 0
        ? defaultLessonIndex
        : 0;
    const nextLesson = lessonSequence[nextLessonIndex]?.lesson ?? null;

    setActiveLessonIndex(nextLessonIndex);
    resetExerciseState();
    setPlayerStep("lesson");

    if (
      requestedStep === "test" &&
      nextLesson?.test &&
      nextLesson.test.exercises.length > 0
    ) {
      startLessonTest(nextLesson);
    }

    setInitializedSessionKey(sessionKey);
  }, [
    course,
    initializedSessionKey,
    lessonSequence,
    requestedLessonId,
    requestedStep,
    sessionKey,
  ]);

  function moveToNextLesson() {
    if (activeLessonIndex + 1 >= lessonSequence.length) {
      setPlayerStep("complete");
      resetExerciseState();
      return;
    }

    setActiveLessonIndex((currentValue) => currentValue + 1);
    setPlayerStep("lesson");
    resetExerciseState();
  }

  function continueFromLesson(lesson: CourseLesson | null) {
    if (!lesson) {
      return;
    }

    if (!lesson.test || lesson.test.exercises.length === 0) {
      moveToNextLesson();
      return;
    }

    startLessonTest(lesson);
  }

  function refreshExercise() {
    if (playerStep !== "exercise" || activeTestExercises.length === 0) {
      return;
    }

    setActiveTestInstances(
      activeTestExercises.map((exercise) => buildExerciseInstance(exercise)),
    );
    setExerciseAnswers(activeTestExercises.map(() => ""));
    setExerciseResults(
      activeTestExercises.map(() => ({ feedback: null, isCorrect: false })),
    );
    setTestFeedback(null);
    setIsTestPassed(false);
  }

  function updateExerciseAnswer(index: number, value: string) {
    setExerciseAnswers((currentAnswers) =>
      currentAnswers.map((answer, answerIndex) =>
        answerIndex === index ? value : answer,
      ),
    );
    setExerciseResults((currentResults) =>
      currentResults.map((result, resultIndex) =>
        resultIndex === index ? { feedback: null, isCorrect: false } : result,
      ),
    );
    setTestFeedback(null);
    setIsTestPassed(false);
  }

  function submitExercise() {
    if (activeTestExercises.length === 0 || activeTestInstances.length === 0) {
      return;
    }

    let allCorrect = true;
    const nextResults = activeTestExercises.map((exercise, index) => {
      const normalizedAnswer = (exerciseAnswers[index] ?? "").trim();

      if (!normalizedAnswer) {
        allCorrect = false;
        return {
          feedback: t("courseDetails.enterAnswer"),
          isCorrect: false,
        };
      }

      const parsedAnswer = Number(normalizedAnswer.replace(",", "."));

      if (Number.isNaN(parsedAnswer)) {
        allCorrect = false;
        return {
          feedback: t("courseDetails.enterAnswer"),
          isCorrect: false,
        };
      }

      const roundedAnswer = roundToPrecision(parsedAnswer, exercise.precision);

      if (roundedAnswer === activeTestInstances[index]?.expectedAnswer) {
        return {
          feedback: null,
          isCorrect: true,
        };
      }

      allCorrect = false;
      return {
        feedback: exercise.hint
          ? t("courseDetails.incorrectAnswerWithHint", { hint: exercise.hint })
          : t("courseDetails.incorrectAnswer"),
        isCorrect: false,
      };
    });

    setExerciseResults(nextResults);
    setIsTestPassed(allCorrect);
    setTestFeedback(
      allCorrect ? t("courseDetails.correctAnswer") : t("courseDetails.incorrectAnswer"),
    );
  }

  function continueAfterExercise() {
    moveToNextLesson();
  }

  function printCourse() {
    window.print();
  }

  function exitPlayer() {
    navigate(`/courses/${courseId}`);
  }

  if (!courseId) {
    return <Navigate replace to="/" />;
  }

  return (
    <main className="min-h-screen bg-stone-100/80">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-6">
        <div className="flex items-center justify-between gap-4">
          <div />
          <div className="flex items-center gap-3">
            {activeTestExercises.length > 0 && playerStep === "exercise" ? (
              <Button
                aria-label={t("courseDetails.refreshExercise")}
                className="!w-10 shrink-0 rounded-full px-0"
                onClick={refreshExercise}
                size="sm"
                variant="secondary"
              >
                <RotateCw aria-hidden="true" className="h-5 w-5" />
              </Button>
            ) : null}
            <Button
              aria-label={t("courseDetails.printCourse")}
              className="!w-10 shrink-0 rounded-full px-0"
              onClick={printCourse}
              size="sm"
              variant="secondary"
            >
              <Printer aria-hidden="true" className="h-5 w-5" />
            </Button>
            <Link
              aria-label={t("courseDetails.closeCourse")}
              className="inline-flex !h-10 !w-10 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white px-0 text-stone-700 shadow-xs transition-colors hover:bg-stone-100"
              to={`/courses/${courseId}`}
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </Link>
          </div>
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
          <div className="flex flex-1 flex-col gap-6">
            <div className="flex flex-col gap-2">
              <CardTitle className="text-3xl">{course.title}</CardTitle>
              {activeLessonEntry ? (
                <CardDescription className="text-base text-stone-600">
                  {activeLessonEntry.sectionTitle}
                  {" · "}
                  {t("courseDetails.progress", {
                    current: activeLessonIndex + 1,
                    total: lessonSequence.length,
                  })}
                </CardDescription>
              ) : null}
            </div>

            {playerStep === "complete" ? (
              <Card className="flex flex-1 items-center justify-center overflow-hidden border-stone-200/80 bg-white/90 shadow-none">
                <CardContent className="flex max-w-2xl flex-col items-center justify-center gap-4 py-16 text-center">
                  <h3 className="text-3xl font-semibold text-stone-950">
                    {t("courseDetails.completedTitle")}
                  </h3>
                  <p className="text-base leading-7 text-stone-600">
                    {t("courseDetails.completedDescription")}
                  </p>
                  <Button onClick={exitPlayer} size="lg" variant="default">
                    {t("courseDetails.closeCourse")}
                  </Button>
                </CardContent>
              </Card>
            ) : activeLesson ? (
              <Card className="overflow-hidden border-stone-200/80 bg-white/90 shadow-none">
                <CardContent className="flex flex-col gap-6">
                  {playerStep === "lesson" ? (
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
                  ) : activeTestExercises.length > 0 &&
                    activeTestInstances.length === activeTestExercises.length ? (
                    <>
                      <div className="flex flex-col gap-6">
                        {activeTestExercises.map((exercise, index) => {
                          const exerciseInstance = activeTestInstances[index];
                          const exerciseResult = exerciseResults[index];

                          if (!exerciseInstance) {
                            return null;
                          }

                          return (
                            <div
                              className="flex flex-col gap-3 border-b border-stone-200 pb-6 last:border-b-0 last:pb-0"
                              key={exercise.id}
                            >
                              <p className="flex items-start gap-1.5 text-base leading-7 text-stone-700">
                                <Badge
                                  className="mt-0.5 size-6 shrink-0 justify-center rounded-full px-0 py-0"
                                  variant="secondary"
                                >
                                  {index + 1}
                                </Badge>
                                {renderInlineMarkdown(
                                  interpolateTemplate(
                                    exercise.prompt,
                                    exerciseInstance.variables,
                                  ),
                                )}
                              </p>
                              <div className="flex max-w-xs flex-col gap-3">
                                <label
                                  className="text-sm font-medium text-stone-700"
                                  htmlFor={`course-exercise-answer-${index}`}
                                >
                                  {t("courseDetails.answerLabel")}
                                </label>
                                <Input
                                  id={`course-exercise-answer-${index}`}
                                  onChange={(event) =>
                                    updateExerciseAnswer(index, event.target.value)
                                  }
                                  placeholder={t("courseDetails.answerPlaceholder")}
                                  value={exerciseAnswers[index] ?? ""}
                                />
                              </div>
                              {exerciseResult?.feedback ? (
                                <div className="text-sm font-medium text-rose-700">
                                  {exerciseResult.feedback}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                      {testFeedback ? (
                        <div
                          className={
                            isTestPassed
                              ? "text-sm font-medium text-emerald-700"
                              : "text-sm font-medium text-rose-700"
                          }
                        >
                          {testFeedback}
                        </div>
                      ) : null}
                      <div className="flex justify-end gap-3">
                        <Button
                          onClick={() =>
                            isTestPassed ? continueAfterExercise() : submitExercise()
                          }
                          size="lg"
                          variant="default"
                        >
                          {isTestPassed
                            ? t("continue")
                            : t("courseDetails.checkAnswer")}
                        </Button>
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
};
