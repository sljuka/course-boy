import { CourseCompleted } from "@/components/course-player/course-completed";
import { CourseLessonContent } from "@/components/course-player/course-lesson-content";
import { CourseTestContent } from "@/components/course-player/course-test-content";
import type { CourseExercise, CourseLesson } from "@/lib/course-package";
import type { ExerciseInstance } from "@/lib/course-player-utils";

type ExerciseResult = {
  feedback: string | null;
  isCorrect: boolean;
};

export const CourseContent = ({
  activeLesson,
  activeTestExercises,
  activeTestInstances,
  exerciseAnswers,
  exerciseResults,
  isCourseComplete,
  isTestPassed,
  isTestRoute,
  onContinueAfterExercise,
  onContinueFromLesson,
  onExitPlayer,
  onSubmitExercise,
  onUpdateExerciseAnswer,
  testFeedback,
}: {
  activeLesson: CourseLesson | null;
  activeTestExercises: CourseExercise[];
  activeTestInstances: ExerciseInstance[];
  exerciseAnswers: string[];
  exerciseResults: ExerciseResult[];
  isCourseComplete: boolean;
  isTestPassed: boolean;
  isTestRoute: boolean;
  onContinueAfterExercise: () => void;
  onContinueFromLesson: (lesson: CourseLesson | null) => void;
  onExitPlayer: () => void;
  onSubmitExercise: () => void;
  onUpdateExerciseAnswer: (index: number, value: string) => void;
  testFeedback: string | null;
}) => {
  if (isCourseComplete) {
    return <CourseCompleted onExitPlayer={onExitPlayer} />;
  }

  if (!activeLesson) {
    return null;
  }

  if (!isTestRoute) {
    return (
      <CourseLessonContent
        activeLesson={activeLesson}
        onContinueFromLesson={onContinueFromLesson}
      />
    );
  }

  return (
    <CourseTestContent
      activeTestExercises={activeTestExercises}
      activeTestInstances={activeTestInstances}
      exerciseAnswers={exerciseAnswers}
      exerciseResults={exerciseResults}
      isTestPassed={isTestPassed}
      onContinueAfterExercise={onContinueAfterExercise}
      onSubmitExercise={onSubmitExercise}
      onUpdateExerciseAnswer={onUpdateExerciseAnswer}
      testFeedback={testFeedback}
    />
  );
};
