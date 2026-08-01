export type CoursePrintAnswerStyle = "box" | "empty" | "lines" | "squares";
export type CoursePrintExerciseHintStyle =
  | "hidden"
  | "upside-down"
  | "visible";

export type CoursePrintOptions = {
  answerStyle: CoursePrintAnswerStyle;
  exerciseHintStyle: CoursePrintExerciseHintStyle;
  showHeader: boolean;
  showTestSeparators: boolean;
};

export const defaultLessonPrintOptions: CoursePrintOptions = {
  answerStyle: "lines",
  exerciseHintStyle: "hidden",
  showHeader: true,
  showTestSeparators: true,
};

export const defaultTestPrintOptions: CoursePrintOptions = {
  answerStyle: "lines",
  exerciseHintStyle: "hidden",
  showHeader: true,
  showTestSeparators: true,
};
