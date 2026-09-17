import type {
  SharedWordTypeTestExerciseDefinition,
  WordTypeCourseExercise,
} from "@/lib/course-package";
import {
  cycleWordTypeSelection,
  decodeWordTypeSelections,
} from "@/lib/exercise-kinds/word-types";

import { WordTypeExerciseFields } from "@/components/word-type-exercise-fields";
import { WordTypeLegend, WordTypeTokens } from "@/components/word-type-tokens";
import type { WordTypeTestExercise } from "@/components/test-editor-prototype-types";
import type { AnswerComponentProps, ExerciseKindEditor } from "@/components/exercise-kinds/types";
import {
  createExercise,
  fromShared,
  toShared,
  validate,
} from "@/components/exercise-kinds/word-types-logic";

function AnswerComponent({
  exercise,
  onAnswerChange,
  value,
}: AnswerComponentProps<WordTypeCourseExercise>) {
  const markedWordCount = exercise.tokens.filter((token) => token.kind === "word").length;
  const wordTypeIds = exercise.wordTypes.map((wordType) => wordType.id);
  const selections = decodeWordTypeSelections(value, markedWordCount);

  return (
    <div className="flex flex-col gap-3 print:hidden">
      <WordTypeLegend wordTypes={exercise.wordTypes} />
      <WordTypeTokens
        onWordClick={(markedWordIndex) =>
          onAnswerChange(
            cycleWordTypeSelection(value, markedWordIndex, wordTypeIds, markedWordCount),
          )
        }
        selections={selections}
        tokens={exercise.tokens}
        wordTypes={exercise.wordTypes}
      />
    </div>
  );
}

export const wordTypesExerciseEditor: ExerciseKindEditor<
  WordTypeTestExercise,
  SharedWordTypeTestExerciseDefinition,
  WordTypeCourseExercise
> = {
  AnswerComponent,
  FieldsComponent: WordTypeExerciseFields,
  createExercise,
  fromShared,
  kind: "word-types",
  label: "Word types",
  description: "A passage where the student tags highlighted words with their grammatical type.",
  toShared,
  validate,
};
