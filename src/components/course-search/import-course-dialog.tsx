import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useImportCourseMutation } from "@/lib/sharing-queries";

type ImportCourseDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function ImportCourseDialog({ onOpenChange, open }: ImportCourseDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const importMutation = useImportCourseMutation();

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && importMutation.isPending) {
      return;
    }

    if (!nextOpen) {
      setCode("");
      importMutation.reset();
    }

    onOpenChange(nextOpen);
  }

  function handleImport() {
    importMutation.mutate(
      { code: code.trim() },
      {
        onSuccess: ({ courseId }) => {
          handleOpenChange(false);
          navigate(`/courses/${courseId}`);
        },
      },
    );
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="w-[min(32rem,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>{t("importCourse.title")}</DialogTitle>
          <DialogDescription>{t("importCourse.description")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="import-course-code">{t("importCourse.codeLabel")}</Label>
          <Input
            autoFocus
            id="import-course-code"
            onChange={(event) => setCode(event.target.value)}
            placeholder={t("importCourse.codePlaceholder")}
            value={code}
          />
        </div>
        {importMutation.error && (
          <Alert variant="destructive">
            <AlertTitle>{t("importCourse.errorTitle")}</AlertTitle>
            <AlertDescription>{importMutation.error.message}</AlertDescription>
          </Alert>
        )}
        <Button
          disabled={!code.trim() || importMutation.isPending}
          onClick={handleImport}
        >
          {importMutation.isPending
            ? t("importCourse.importing")
            : t("importCourse.importButton")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
