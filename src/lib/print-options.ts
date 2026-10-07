export type CoursePrintAnswerStyle = "box" | "empty" | "lines" | "squares";
export type CoursePrintExerciseHintStyle =
  | "hidden"
  | "upside-down"
  | "visible";

export type CoursePrintOptions = {
  answerStyle: CoursePrintAnswerStyle;
  exerciseHintStyle: CoursePrintExerciseHintStyle;
  // Exercises' decorative images and videos (SLJ-56): left out unless the
  // student asks for them; media that's part of the question always prints.
  showDecorativeMedia: boolean;
  showHeader: boolean;
  showTestSeparators: boolean;
};

export const defaultLessonPrintOptions: CoursePrintOptions = {
  answerStyle: "lines",
  exerciseHintStyle: "hidden",
  showDecorativeMedia: false,
  showHeader: true,
  showTestSeparators: true,
};

export const defaultTestPrintOptions: CoursePrintOptions = {
  answerStyle: "lines",
  exerciseHintStyle: "hidden",
  showDecorativeMedia: false,
  showHeader: true,
  showTestSeparators: true,
};
