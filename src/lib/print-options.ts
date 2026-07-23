export type CoursePrintAnswerStyle = "box" | "empty" | "lines";

export type CoursePrintOptions = {
  answerStyle: CoursePrintAnswerStyle;
  showHeader: boolean;
  showTestSeparators: boolean;
};

export const defaultLessonPrintOptions: CoursePrintOptions = {
  answerStyle: "lines",
  showHeader: true,
  showTestSeparators: true,
};

export const defaultTestPrintOptions: CoursePrintOptions = {
  answerStyle: "lines",
  showHeader: true,
  showTestSeparators: true,
};
