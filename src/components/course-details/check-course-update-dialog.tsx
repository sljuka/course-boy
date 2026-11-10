import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import type { CourseUpdateCheck } from "@/lib/sharing";
import { useCheckCourseUpdateMutation } from "@/lib/sharing-queries";

// "Check for updates" on an imported course (SLJ-184): asks as soon as it
// opens and always says what it found. A newer version is applied where it
// always is, on the course page (its notice, or its quiet line after "Finish
// on this version"), so "Show the update" goes there.
export function CheckCourseUpdateDialog({
  course,
  onOpenChange,
}: {
  course: { id: string; title: string } | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const check = useCheckCourseUpdateMutation();
  // `mutate`/`reset`, not the whole mutation: it changes on every render.
  const { mutate, reset } = check;
  const courseId = course?.id ?? null;

  useEffect(() => {
    if (courseId) {
      mutate(courseId);
    } else {
      reset();
    }
  }, [courseId, mutate, reset]);

  const result: CourseUpdateCheck | undefined = check.isError ? { reason: "failed", status: "error" } : check.data;
  const text = result ? describe(result, t) : null;

  return (
    <Dialog onOpenChange={(open) => !open && onOpenChange(false)} open={Boolean(course)}>
      <DialogContent className="w-[min(30rem,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>{text?.title ?? t("courseUpdates.check.title")}</DialogTitle>
          {text ? (
            <DialogDescription data-status={result?.status} data-testid="check-course-update-result">
              {text.description}
            </DialogDescription>
          ) : (
            <div className="flex items-start gap-2" data-testid="check-course-update-pending">
              <Spinner aria-hidden="true" className="mt-0.5 shrink-0" />
              <DialogDescription>
                {t("courseUpdates.check.checking")} {t("courseUpdates.check.checkingHint")}
              </DialogDescription>
            </div>
          )}
        </DialogHeader>
        <DialogFooter>
          {(result?.status === "nobody-online" || result?.status === "error") && courseId && (
            <Button onClick={() => mutate(courseId)} variant="secondary">
              {t("courseUpdates.check.retry")}
            </Button>
          )}
          {result?.status === "update" && courseId ? (
            <Button
              data-testid="check-course-update-show"
              onClick={() => {
                onOpenChange(false);
                navigate(`/courses/${courseId}`);
              }}
            >
              {t("courseUpdates.check.showUpdate")}
            </Button>
          ) : (
            <Button
              data-testid="check-course-update-close"
              onClick={() => onOpenChange(false)}
              variant={result ? "default" : "secondary"}
            >
              {t("courseUpdates.check.close")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function describe(result: CourseUpdateCheck, t: (key: string, options?: Record<string, string>) => string) {
  switch (result.status) {
    case "up-to-date":
      return {
        description: t("courseUpdates.check.upToDateDescription", { version: result.installedVersion }),
        title: t("courseUpdates.check.upToDateTitle"),
      };
    case "update":
      return {
        description: t("courseUpdates.check.updateDescription", { installed: result.installedVersion }),
        title: t("courseUpdates.check.updateTitle", { version: result.version }),
      };
    case "refused":
      return {
        description: t("courseUpdates.refusedDescription"),
        title: t("courseUpdates.refusedTitle", { version: result.version }),
      };
    case "nobody-online":
      return {
        description: t("courseUpdates.check.nobodyOnlineDescription", { version: result.installedVersion }),
        title: t("courseUpdates.check.nobodyOnlineTitle"),
      };
    case "error":
      return {
        description: t(
          result.reason === "not-followed"
            ? "courseUpdates.check.errorNotFollowed"
            : result.reason === "no-version"
              ? "courseUpdates.check.errorNoVersion"
              : "courseUpdates.check.errorFailed",
        ),
        title: t("courseUpdates.check.errorTitle"),
      };
  }
}
