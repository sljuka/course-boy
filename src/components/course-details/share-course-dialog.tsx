import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCourseVersionHistoryQuery } from "@/lib/course-queries";
import {
  useAcknowledgeCreatorKeyMutation,
  useHasAcknowledgedCreatorKeyQuery,
  useShareCourseMutation,
} from "@/lib/sharing-queries";

type ShareCourseDialogProps = {
  courseId: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function ShareCourseDialog({
  courseId,
  onOpenChange,
  open,
}: ShareCourseDialogProps) {
  const { t } = useTranslation();
  const [version, setVersion] = useState<string | undefined>(undefined);
  const [hasCopied, setHasCopied] = useState(false);
  const { data: history } = useCourseVersionHistoryQuery(open ? courseId : undefined);
  const { data: hasAcknowledged, isLoading: isAcknowledgmentLoading } =
    useHasAcknowledgedCreatorKeyQuery();
  const acknowledgeMutation = useAcknowledgeCreatorKeyMutation();
  const shareMutation = useShareCourseMutation();

  const publishedVersions =
    history?.versions.filter((entry) => entry.isEverPublished) ?? [];

  useEffect(() => {
    if (open && history?.publishedVersion && version === undefined) {
      setVersion(history.publishedVersion);
    }
  }, [history?.publishedVersion, open, version]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && shareMutation.isPending) {
      return;
    }

    if (!nextOpen) {
      setVersion(undefined);
      setHasCopied(false);
      shareMutation.reset();
    }

    onOpenChange(nextOpen);
  }

  function handleCopy(code: string) {
    void navigator.clipboard.writeText(code).then(() => {
      setHasCopied(true);
    });
  }

  const hasNeverPublished = Boolean(history) && !history?.publishedVersion;

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="w-[min(32rem,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>{t("shareCourse.title")}</DialogTitle>
          <DialogDescription>{t("shareCourse.description")}</DialogDescription>
        </DialogHeader>

        {hasNeverPublished ? (
          <Alert>
            <AlertTitle>{t("shareCourse.notPublishedTitle")}</AlertTitle>
            <AlertDescription>{t("shareCourse.notPublishedDescription")}</AlertDescription>
          </Alert>
        ) : isAcknowledgmentLoading ? null : !hasAcknowledged ? (
          <div className="flex flex-col gap-4">
            <Alert>
              <AlertTitle>{t("shareCourse.acknowledgmentTitle")}</AlertTitle>
              <AlertDescription>
                {t("shareCourse.acknowledgmentDescription")}
              </AlertDescription>
            </Alert>
            <Button
              disabled={acknowledgeMutation.isPending}
              onClick={() => acknowledgeMutation.mutate()}
            >
              {t("shareCourse.acknowledgmentConfirm")}
            </Button>
          </div>
        ) : shareMutation.data ? (
          <div className="flex flex-col gap-2">
            <Label>{t("shareCourse.codeLabel")}</Label>
            <div className="flex gap-2">
              <Input readOnly value={shareMutation.data.code} />
              <Button
                onClick={() => handleCopy(shareMutation.data!.code)}
                size="icon"
                variant="secondary"
              >
                {hasCopied ? (
                  <Check aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <Copy aria-hidden="true" className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>{t("shareCourse.versionLabel")}</Label>
              <Select
                onValueChange={(value) => setVersion(value ?? undefined)}
                value={version}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {publishedVersions.map((entry) => (
                    <SelectItem key={entry.version} value={entry.version}>
                      {entry.version === history?.publishedVersion
                        ? t("shareCourse.latestVersionOption", { version: entry.version })
                        : entry.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {shareMutation.error && (
              <Alert variant="destructive">
                <AlertTitle>{t("shareCourse.errorTitle")}</AlertTitle>
                <AlertDescription>{shareMutation.error.message}</AlertDescription>
              </Alert>
            )}
            <Button
              disabled={!version || shareMutation.isPending}
              onClick={() => shareMutation.mutate({ courseId, version })}
            >
              {shareMutation.isPending
                ? t("shareCourse.sharing")
                : t("shareCourse.shareButton")}
            </Button>
            <CardDescription>{t("shareCourse.hint")}</CardDescription>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
