import { useTranslation } from "react-i18next";

import { ChannelListingToggle } from "@/components/channels/channel-listing-toggle";
import { CourseCode } from "@/components/course-details/course-code";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Shows a course's code: after Publish ("Published 0.2") and from the course
// page ("Share"), which also says which version the code gives (`version`).
// `showChannelListing`: after Publish, "Show on my channel" (SLJ-31).
export function CourseCodeDialog({
  courseId,
  description,
  onClose,
  open,
  showChannelListing = false,
  title,
  version,
}: {
  courseId: string;
  description: string;
  onClose: () => void;
  open: boolean;
  showChannelListing?: boolean;
  title: string;
  version?: string | null;
}) {
  const { t } = useTranslation();

  return (
    <Dialog onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open}>
      <DialogContent className="w-[min(36rem,calc(100vw-2rem))] sm:max-w-[36rem]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {version && (
          <CardDescription data-testid="shared-version">{t("courseSharing.sharedVersion", { version })}</CardDescription>
        )}
        <CourseCode courseId={courseId} />
        {showChannelListing && <ChannelListingToggle courseId={courseId} />}
        <DialogFooter>
          <Button onClick={onClose} variant="secondary">
            {t("courseSharing.done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
