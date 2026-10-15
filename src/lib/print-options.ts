export type CoursePrintAnswerStyle = "box" | "empty" | "lines" | "squares";
// How much fits on a page (SLJ-142): comfortable is full size; standard and
// compact shrink the letters and spacing to save paper.
export type CoursePrintDensity = "comfortable" | "compact" | "standard";
export type CoursePrintExerciseHintStyle =
  | "hidden"
  | "upside-down"
  | "visible";

export type CoursePrintOptions = {
  answerStyle: CoursePrintAnswerStyle;
  density: CoursePrintDensity;
  exerciseHintStyle: CoursePrintExerciseHintStyle;
  // Exercises' decorative images and videos (SLJ-56): left out unless the
  // student asks for them; media that's part of the question always prints.
  showDecorativeMedia: boolean;
  // Blank "Name:" and "Date:" lines at the top for the student to fill in by
  // hand (SLJ-143): off unless asked.
  showDateField: boolean;
  showHeader: boolean;
  showNameField: boolean;
  // A graded test's points beside each question (SLJ-135): off unless asked.
  showPoints: boolean;
  showTestSeparators: boolean;
};

export const defaultLessonPrintOptions: CoursePrintOptions = {
  answerStyle: "lines",
  density: "comfortable",
  exerciseHintStyle: "hidden",
  showDecorativeMedia: false,
  showDateField: false,
  showHeader: true,
  showNameField: false,
  showPoints: false,
  showTestSeparators: true,
};

export const defaultTestPrintOptions: CoursePrintOptions = {
  answerStyle: "lines",
  density: "comfortable",
  exerciseHintStyle: "hidden",
  showDecorativeMedia: false,
  showDateField: false,
  showHeader: true,
  showNameField: false,
  showPoints: false,
  showTestSeparators: true,
};
