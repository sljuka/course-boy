import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useDeleteCourseLessonMutation,
  useDeleteCourseSectionMutation,
  useDeleteCourseSectionTestMutation,
} from "@/lib/course-queries";

// A "test" here covers both a standalone section-level test and a
// lesson-attached one — both are just a single `<testId>.json` file in the
// section directory, so the same delete IPC call handles either.
export type PendingExplorerDelete =
  | { kind: "document"; id: string; sectionId: string; title: string }
  | { kind: "section"; id: string; title: string }
  | { kind: "test"; id: string; sectionId: string; title: string };

type ExplorerDeleteDialogProps = {
  courseId: string;
  onDeleted: () => void;
  onOpenChange: (open: boolean) => void;
  pending: PendingExplorerDelete | null;
};

const titleKeyByKind: Record<PendingExplorerDelete["kind"], string> = {
  document: "explorer.removeDocumentTitle",
  section: "explorer.removeSectionTitle",
  test: "explorer.removeTestTitle",
};

const descriptionKeyByKind: Record<PendingExplorerDelete["kind"], string> = {
  document: "explorer.removeDocumentDescription",
  section: "explorer.removeSectionDescription",
  test: "explorer.removeTestDescription",
};

export function ExplorerDeleteDialog({
  courseId,
  onDeleted,
  onOpenChange,
  pending,
}: ExplorerDeleteDialogProps) {
  const { t } = useTranslation();
  const deleteSectionMutation = useDeleteCourseSectionMutation();
  const deleteLessonMutation = useDeleteCourseLessonMutation();
  const deleteTestMutation = useDeleteCourseSectionTestMutation();
  const isPending =
    deleteSectionMutation.isPending ||
    deleteLessonMutation.isPending ||
    deleteTestMutation.isPending;

  function handleConfirm() {
    if (!pending) {
      return;
    }

    const mutation =
      pending.kind === "section"
        ? deleteSectionMutation.mutateAsync({ courseId, sectionId: pending.id })
        : pending.kind === "document"
          ? deleteLessonMutation.mutateAsync({
              courseId,
              lessonId: pending.id,
              sectionId: pending.sectionId,
            })
          : deleteTestMutation.mutateAsync({
              courseId,
              sectionId: pending.sectionId,
              testId: pending.id,
            });

    void mutation.then(() => {
      onOpenChange(false);
      onDeleted();
    });
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open && !isPending) {
          onOpenChange(false);
        }
      }}
      open={Boolean(pending)}
    >
      <DialogContent className="h-auto w-[min(32rem,calc(100vw-2rem))] rounded-3xl border p-0 shadow-[0_24px_80px_-32px_rgba(41,37,36,0.35)]">
        <DialogHeader className="border-b-0 px-6 py-5">
          <div className="space-y-2">
            <DialogTitle>{pending && t(titleKeyByKind[pending.kind])}</DialogTitle>
            <DialogDescription>
              {pending &&
                t(descriptionKeyByKind[pending.kind], { title: pending.title })}
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className="flex justify-end gap-3 px-6 pb-6 pt-0">
          <Button
            disabled={isPending}
            onClick={() => onOpenChange(false)}
            variant="secondary"
          >
            {t("explorer.cancelRemove")}
          </Button>
          <Button onClick={handleConfirm} variant="destructive">
            {isPending ? t("explorer.removing") : t("explorer.confirmRemove")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
