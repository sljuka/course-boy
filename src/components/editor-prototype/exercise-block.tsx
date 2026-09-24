import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { BlockNoteEditor } from "@blocknote/core";
import { createReactBlockSpec, useBlockNoteEditor } from "@blocknote/react";

import { ExercisePromptHeader } from "@/components/course-player/exercise-prompt-header";
import { useDocumentEditorContext } from "@/components/editor-prototype/document-editor-context";
import { getExerciseKindEditor, listExerciseKindEditors } from "@/components/exercise-kinds/registry";
import { toSharedTestExerciseDefinition } from "@/components/test-editor-prototype-persistence";
import type { TestExercise } from "@/components/test-editor-prototype-types";
import { deriveExerciseResult } from "@/components/test-player/use-test-player-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LocalesTabs } from "@/components/locales-tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExerciseKind } from "@/lib/course-package";
import { buildExerciseInstance, getExercisePromptSource } from "@/lib/course-player-utils";
import { resolveSharedExerciseForPlayer } from "@/lib/exercise-kinds/registry";
import type { Locale } from "@/lib/i18n";
import { useAppState } from "@/lib/use-app-state";

function parseExercise(data: string): TestExercise | null {
  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data) as TestExercise;
  } catch {
    return null;
  }
}

function ExerciseKindPicker({ onChoose }: { onChoose: (kind: ExerciseKind) => void }) {
  const [kind, setKind] = useState<ExerciseKind>("numeric");

  return (
    <div className="flex w-full flex-col gap-2 rounded-lg border border-dashed border-border p-4">
      <Label htmlFor="inline-exercise-kind">Exercise type</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Select onValueChange={(value) => value && setKind(value as ExerciseKind)} value={kind}>
          <SelectTrigger className="w-full sm:w-56" id="inline-exercise-kind">
            <SelectValue>{getExerciseKindEditor(kind).label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {listExerciseKindEditors().map((editor) => (
              <SelectItem key={editor.kind} value={editor.kind}>
                {editor.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => onChoose(kind)} size="sm">
          Add exercise
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{getExerciseKindEditor(kind).description}</p>
    </div>
  );
}

function ExerciseAuthoringCard({
  courseId,
  exercise,
  onChange,
  supportedLocales,
}: {
  courseId: string;
  exercise: TestExercise;
  onChange: (exercise: TestExercise) => void;
  supportedLocales: Locale[];
}) {
  const [activeLocale, setActiveLocale] = useState<Locale>(supportedLocales[0]);
  const FieldsComponent = getExerciseKindEditor(exercise.kind).FieldsComponent;

  return (
    <div className="flex w-full flex-col gap-3 rounded-lg border border-dashed border-border p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Exercise · {getExerciseKindEditor(exercise.kind).label}
      </p>
      <LocalesTabs
        activeLocale={activeLocale}
        locales={supportedLocales}
        onActiveLocaleChange={setActiveLocale}
        renderContent={(locale) => (
          <FieldsComponent
            courseId={courseId}
            exercise={exercise}
            locale={locale}
            onChange={(updater) => onChange(updater(exercise))}
          />
        )}
      />
    </div>
  );
}

function ExercisePlayerCard({ courseId, exercise }: { courseId: string; exercise: TestExercise }) {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const [answer, setAnswer] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const courseExercise = useMemo(
    () =>
      resolveSharedExerciseForPlayer(
        toSharedTestExerciseDefinition(exercise),
        exercise.id,
        [locale],
        courseId,
      ),
    [courseId, exercise, locale],
  );
  const instance = useMemo(() => buildExerciseInstance(courseExercise), [courseExercise]);
  const result = hasSubmitted ? deriveExerciseResult(courseExercise, instance, answer, t) : null;
  const { AnswerComponent } = getExerciseKindEditor(courseExercise.kind);
  const promptSource = getExercisePromptSource(courseExercise, instance);

  return (
    <div
      className={
        "flex w-full flex-col gap-3 rounded-lg border p-4 transition-colors " +
        (result?.isCorrect ? "border-success" : hasSubmitted ? "border-warning" : "border-border")
      }
    >
      <ExercisePromptHeader index={0} promptSource={promptSource} showIndex={false} />
      <AnswerComponent
        exercise={courseExercise}
        index={0}
        instance={instance}
        onAnswerChange={(value) => {
          setAnswer(value);
          setHasSubmitted(false);
        }}
        value={answer}
      />
      {result && !result.isCorrect && (
        <Alert variant="warning">
          <AlertDescription>{result.feedback}</AlertDescription>
        </Alert>
      )}
      {result?.isCorrect && (
        <Alert variant="success">
          <AlertDescription>{t("courseDetails.inlineExerciseCorrect")}</AlertDescription>
        </Alert>
      )}
      <Button
        className="self-start"
        onClick={() => setHasSubmitted(true)}
        size="sm"
        type="button"
      >
        {t("courseDetails.checkAnswer")}
      </Button>
    </div>
  );
}

// `createReactBlockSpec` returns a factory (`(options?) => BlockSpec`), not
// the spec itself — called immediately here so consumers (`blocknote-schema.ts`)
// get a ready-to-use spec, matching how `defaultBlockSpecs`' entries are
// already plain specs, not factories.
export const exerciseBlockSpec = createReactBlockSpec(
  {
    type: "exercise",
    propSchema: { data: { default: "" } },
    content: "none",
  },
  {
    // A named function expression (not an arrow) so the react-hooks lint
    // rule recognizes this as a component by name and allows the hook calls
    // below — `createReactBlockSpec` really does mount this through React's
    // normal render pipeline (confirmed empirically), the plain arrow form
    // just doesn't look like a component to the rule.
    render: function ExerciseBlockRenderer(props) {
      const editor = useBlockNoteEditor();
      const { courseId, supportedLocales } = useDocumentEditorContext();
      const exercise = parseExercise(props.block.props.data);

      function updateExercise(nextExercise: TestExercise) {
        editor.updateBlock(props.block, {
          props: { data: JSON.stringify(nextExercise) },
        });
      }

      if (editor.isEditable) {
        if (!exercise) {
          return (
            <ExerciseKindPicker
              onChoose={(kind) =>
                updateExercise(getExerciseKindEditor(kind).createExercise(supportedLocales))
              }
            />
          );
        }

        return (
          <ExerciseAuthoringCard
            courseId={courseId}
            exercise={exercise}
            onChange={updateExercise}
            supportedLocales={supportedLocales}
          />
        );
      }

      if (!exercise) {
        return null;
      }

      return <ExercisePlayerCard courseId={courseId} exercise={exercise} />;
    },
  },
)();

/**
 * A custom block registered via `blockSpecs` doesn't automatically get a
 * slash-menu entry — this is the item `draft-document-editor.tsx` appends to
 * the default list so "/" can actually insert one.
 */
// Generic-erased on purpose, same as `ExerciseKindEditor<any, any, any>` in
// `registry.ts` — this only ever calls schema-agnostic editor methods.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createExerciseSlashMenuItem(editor: BlockNoteEditor<any, any, any>) {
  return {
    aliases: ["exercise", "question", "quiz"],
    // Its own group, not "Advanced" — sharing a group name with a built-in
    // item (Table) produces a duplicate group header once the built-in item
    // gets filtered out of a narrowed query but the group name doesn't.
    group: "Course",
    onItemClick: () => {
      const currentBlock = editor.getTextCursorPosition().block;

      editor.insertBlocks([{ type: "exercise", props: { data: "" } }], currentBlock, "after");
    },
    subtext: "A gradable exercise a student answers inline",
    title: "Exercise",
  };
}
