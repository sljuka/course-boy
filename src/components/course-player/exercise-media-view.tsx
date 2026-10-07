import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useVideoPrintFrames } from "@/components/course-player/use-video-print-frames";
import { CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MediaFrame } from "@/components/ui/media-frame";
import type { CourseExerciseMedia } from "@/lib/exercise-media";
import { cn } from "@/lib/utils";

// An exercise's image or video, above its prompt (SLJ-56), wherever a student
// sees the exercise: a test (on screen and printed) and an exercise inside a
// lesson.
//
// - An image enlarges on click. Without alt text it's announced as "Image",
//   never by its file name.
// - A video plays in the browser's player, without autoplay or a download
//   button. In print it shows its first frame, and says to watch it in Matko.
// - Decorative media is smaller and hidden from screen readers; printing
//   leaves it out unless `printDecorative`.
export function ExerciseMediaView({
  media,
  printDecorative = false,
}: {
  media: CourseExerciseMedia | undefined;
  printDecorative?: boolean;
}) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEnlarged, setIsEnlarged] = useState(false);
  useVideoPrintFrames(containerRef, media?.url);

  if (!media) {
    return null;
  }

  const label = media.alt ?? (media.kind === "image" ? t("exerciseMedia.image") : undefined);

  return (
    <div
      aria-hidden={media.decorative || undefined}
      className={cn("exercise-media flex flex-col gap-1", media.decorative && !printDecorative && "print:hidden")}
      data-decorative={media.decorative || undefined}
      data-testid="exercise-media"
      ref={containerRef}
    >
      <div className="flex justify-center">
        {media.kind === "image" ? (
          media.decorative ? (
            <MediaFrame size="small">
              <img alt="" src={media.url} />
            </MediaFrame>
          ) : (
            <button
              aria-label={t("exerciseMedia.enlarge")}
              className="flex w-full max-w-xl cursor-zoom-in justify-center"
              onClick={() => setIsEnlarged(true)}
              type="button"
            >
              <MediaFrame>
                <img alt={label} src={media.url} />
              </MediaFrame>
            </button>
          )
        ) : (
          <MediaFrame size={media.decorative ? "small" : "default"}>
            <video
              aria-label={media.decorative ? undefined : label}
              controls
              controlsList="nodownload"
              disablePictureInPicture
              preload="metadata"
              src={media.url}
              tabIndex={media.decorative ? -1 : undefined}
            />
          </MediaFrame>
        )}
      </div>
      {media.kind === "video" && <CardDescription className="hidden text-center print:block">{t("exerciseMedia.printVideo")}</CardDescription>}
      {media.kind === "image" && !media.decorative && (
        <Dialog onOpenChange={setIsEnlarged} open={isEnlarged}>
          <DialogContent className="w-[min(calc(100vw-2rem),64rem)] max-w-none pt-10 sm:max-w-none">
            <DialogTitle className="sr-only">{label}</DialogTitle>
            <MediaFrame size="large">
              <img alt={label} src={media.url} />
            </MediaFrame>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
