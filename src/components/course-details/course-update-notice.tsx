import { CircleAlert, Download, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  useApplyCourseUpdateMutation,
  useCourseSharingQuery,
  useFinishOnVersionMutation,
} from "@/lib/sharing-queries";
import { CourseUpdateDialog } from "./course-update-dialog";

// On an imported course's page (SLJ-39): a newer version from the teacher.
// Never applied silently, and only offered here, never inside the lesson or test
// player, so an update can't land while a test is open.
// - prominent: a banner with Update / What's new / Finish on this version;
// - quiet (after "Finish on this version"): one line with an Update button;
// - refused: a warning that a newer version came from a different source.
export function CourseUpdateNotice({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const { data: sharing } = useCourseSharingQuery(courseId);
  const applyMutation = useApplyCourseUpdateMutation();
  const finishMutation = useFinishOnVersionMutation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const update = sharing?.update ?? null;

  function apply() {
    applyMutation.mutate(courseId, { onSuccess: () => setIsDialogOpen(false) });
  }

  // A big update shows its release notes before it's applied.
  function requestUpdate() {
    if (update?.isMajor) {
      setIsDialogOpen(true);
    } else {
      apply();
    }
  }

  const updateButton = update && (
    <Button
      data-testid="apply-course-update"
      disabled={applyMutation.isPending}
      onClick={requestUpdate}
      size="sm"
      variant={update.visibility === "prominent" ? "default" : "secondary"}
    >
      {applyMutation.isPending ? <Spinner aria-hidden="true" /> : <Download aria-hidden="true" />}
      {applyMutation.isPending ? t("courseUpdates.updating") : t("courseUpdates.updateButton")}
    </Button>
  );

  return (
    <>
      {sharing?.refusedUpdate && (
        <Alert variant="destructive">
          <ShieldAlert aria-hidden="true" />
          <AlertTitle>{t("courseUpdates.refusedTitle", { version: sharing.refusedUpdate.version })}</AlertTitle>
          <AlertDescription>{t("courseUpdates.refusedDescription")}</AlertDescription>
        </Alert>
      )}
      {applyMutation.error && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>{t("courseUpdates.errorTitle")}</AlertTitle>
          <AlertDescription>{applyMutation.error.message}</AlertDescription>
        </Alert>
      )}
      {update?.visibility === "prominent" && (
        <Alert data-testid="course-update-notice" variant={update.kind === "recommended" ? "warning" : "info"}>
          <Download aria-hidden="true" />
          <AlertTitle>
            {update.isMajor
              ? t("courseUpdates.bigUpdateTitle", { version: update.version })
              : update.kind === "recommended"
                ? t("courseUpdates.recommendedTitle", { version: update.version })
                : t("courseUpdates.availableTitle", { version: update.version })}
          </AlertTitle>
          <AlertDescription>
            {update.kind === "recommended"
              ? t("courseUpdates.recommendedDescription")
              : t("courseUpdates.availableDescription")}
          </AlertDescription>
          <div className="col-start-2 mt-2 flex flex-wrap gap-2">
            {updateButton}
            <Button onClick={() => setIsDialogOpen(true)} size="sm" variant="secondary">
              {t("courseUpdates.whatsNew")}
            </Button>
            <Button
              disabled={finishMutation.isPending || applyMutation.isPending}
              onClick={() => finishMutation.mutate(courseId)}
              size="sm"
              variant="ghost"
            >
              {t("courseUpdates.finishOnVersion")}
            </Button>
          </div>
        </Alert>
      )}
      {update?.visibility === "quiet" && (
        <div className="flex flex-wrap items-center gap-2" data-testid="course-update-quiet">
          <CardDescription>{t("courseUpdates.quietLine", { version: update.version })}</CardDescription>
          {updateButton}
        </div>
      )}
      {update && (
        <CourseUpdateDialog
          isApplying={applyMutation.isPending}
          onApply={apply}
          onClose={() => setIsDialogOpen(false)}
          open={isDialogOpen}
          update={update}
        />
      )}
    </>
  );
}
