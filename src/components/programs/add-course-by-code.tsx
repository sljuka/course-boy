import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { ProgramCourse } from "@/lib/program-package";
import { usePeekCourseMutation } from "@/lib/program-queries";

const CODE_PATTERN = /^[a-z0-9]{52,64}$/i;

// Adds another publisher's course to a program by its code (SLJ-32 phase 2).
// The course is looked up online (someone sharing it must be online), and its
// titles and descriptions become the program's snapshot of it; nothing is
// imported.
export function AddCourseByCode({
  existingCourseIds,
  onAdd,
}: {
  existingCourseIds: string[];
  onAdd: (course: ProgramCourse) => void;
}) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const peekMutation = usePeekCourseMutation();
  const trimmed = code.trim();

  function handleAdd() {
    if (!CODE_PATTERN.test(trimmed)) {
      setProblem(t("programSharing.invalidCode"));
      return;
    }
    setProblem(null);
    peekMutation.mutate(trimmed, {
      onError: (error) => setProblem(error.message),
      onSuccess: (result) => {
        if ("notFound" in result) {
          setProblem(t("programSharing.courseNotFound"));
        } else if (existingCourseIds.includes(result.course.courseId)) {
          setProblem(t("programSharing.courseAlreadyAdded"));
        } else {
          onAdd(result.course);
          setCode("");
        }
      },
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <Input
          aria-label={t("programSharing.addByCode")}
          data-testid="program-add-by-code"
          disabled={peekMutation.isPending}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && trimmed && handleAdd()}
          placeholder={t("programSharing.addByCode")}
          value={code}
        />
        <Button
          data-testid="program-add-by-code-submit"
          disabled={!trimmed || peekMutation.isPending}
          onClick={handleAdd}
          variant="secondary"
        >
          {peekMutation.isPending ? <Spinner aria-hidden="true" /> : <Plus aria-hidden="true" />}
          {peekMutation.isPending ? t("programSharing.lookingUp") : t("programSharing.add")}
        </Button>
      </div>
      {problem && <FieldError data-testid="program-add-by-code-error">{problem}</FieldError>}
    </div>
  );
}
