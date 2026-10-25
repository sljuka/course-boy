import { useTranslation } from "react-i18next";
import { History, ImagePlus, Trash2 } from "lucide-react";

import { useDocumentEditorContext } from "@/components/editor-prototype/document-editor-context";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TIMELINE_ICON_COMPONENTS } from "@/components/course-player/timeline-icons";
import { TimelinePoint, TimelinePointImage } from "@/components/ui/timeline";
import { matkoAssetUrl } from "@/lib/course-assets";
import { useUploadCourseAssetMutation } from "@/lib/course-queries";
import { TIMELINE_ICONS, type TimelineIcon, type TimelineMarker } from "@/lib/lesson-timeline";

// The editor's form for a timeline point (SLJ-35, timeline-block.tsx): its
// name, year (or years, before the common era too), how the date is written,
// a caption and a small picture from the course's files, or an icon.
const parseYear = (text: string): number | undefined => {
  const year = Number.parseInt(text, 10);
  return Number.isFinite(year) && year > 0 ? year : undefined;
};

export function TimelinePointFields({
  marker,
  onChange,
}: {
  marker: TimelineMarker;
  onChange: (marker: TimelineMarker) => void;
}) {
  const { t } = useTranslation();
  const { courseId } = useDocumentEditorContext();
  const upload = useUploadCourseAssetMutation();
  // Years before the common era are stored negative; the fields show them
  // as written ("490" with "BC" ticked).
  const bce = (marker.year ?? 0) < 0;
  const update = (changes: Partial<TimelineMarker>) => onChange({ ...marker, ...changes });
  const withEra = (year: number | undefined, isBce: boolean) => (year === undefined ? undefined : isBce ? -year : year);
  const id = (field: string) => `timeline-${field}-${courseId}-${marker.label}`;

  function addImage() {
    upload.mutate(
      { courseId, kind: "image" },
      { onSuccess: (result) => result && update({ image: result.path }) },
    );
  }

  return (
    <div
      className="flex w-full flex-col gap-3 rounded-lg border border-dashed border-border p-4"
      contentEditable={false}
      data-testid="timeline-block"
    >
      <div className="flex items-center gap-2">
        <History aria-hidden="true" className="size-4" />
        <FieldDescription>{t("lessonTimeline.editorHint")}</FieldDescription>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor={id("label")}>{t("lessonTimeline.label")}</FieldLabel>
          <Input
            data-testid="timeline-label"
            id={id("label")}
            onChange={(event) => update({ label: event.target.value })}
            placeholder={t("lessonTimeline.labelPlaceholder")}
            value={marker.label}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={id("year")}>{t("lessonTimeline.year")}</FieldLabel>
          <Input
            data-testid="timeline-year"
            id={id("year")}
            inputMode="numeric"
            onChange={(event) => update({ year: withEra(parseYear(event.target.value), bce) })}
            value={marker.year === undefined ? "" : String(Math.abs(marker.year))}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={id("end-year")}>{t("lessonTimeline.endYear")}</FieldLabel>
          <Input
            id={id("end-year")}
            inputMode="numeric"
            onChange={(event) => update({ endYear: withEra(parseYear(event.target.value), bce) })}
            value={marker.endYear === undefined ? "" : String(Math.abs(marker.endYear))}
          />
        </Field>
        <Field className="sm:col-span-2" orientation="horizontal">
          <Checkbox
            checked={bce}
            id={id("bce")}
            onCheckedChange={(checked) =>
              update({
                endYear: withEra(marker.endYear === undefined ? undefined : Math.abs(marker.endYear), checked === true),
                year: withEra(marker.year === undefined ? undefined : Math.abs(marker.year), checked === true),
              })
            }
          />
          <FieldLabel htmlFor={id("bce")}>{t("lessonTimeline.bce")}</FieldLabel>
        </Field>
        <Field>
          <FieldLabel htmlFor={id("date-text")}>{t("lessonTimeline.dateText")}</FieldLabel>
          <Input
            id={id("date-text")}
            onChange={(event) => update({ dateText: event.target.value })}
            placeholder={t("lessonTimeline.dateTextPlaceholder")}
            value={marker.dateText ?? ""}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={id("caption")}>{t("lessonTimeline.caption")}</FieldLabel>
          <Input id={id("caption")} onChange={(event) => update({ caption: event.target.value })} value={marker.caption ?? ""} />
        </Field>
      </div>
      {marker.image ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative size-10 shrink-0">
            <TimelinePoint kind="picture" state="active" tabIndex={-1} x={20} y={20}>
              <TimelinePointImage alt="" src={matkoAssetUrl(courseId, marker.image)} />
            </TimelinePoint>
          </div>
          <Field className="min-w-48 flex-1">
            <FieldLabel htmlFor={id("image-alt")}>{t("lessonTimeline.imageAlt")}</FieldLabel>
            <Input id={id("image-alt")} onChange={(event) => update({ imageAlt: event.target.value })} value={marker.imageAlt ?? ""} />
          </Field>
          <Button disabled={upload.isPending} onClick={addImage} size="sm" type="button" variant="secondary">
            {t("lessonTimeline.replaceImage")}
          </Button>
          <Button
            onClick={() => update({ image: undefined, imageAlt: undefined })}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" />
            {t("lessonTimeline.removeImage")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <Field className="w-56">
            <FieldLabel htmlFor={id("icon")}>{t("lessonTimeline.icon")}</FieldLabel>
            <Select
              onValueChange={(value) => update({ icon: value === "none" ? undefined : (value as TimelineIcon) })}
              value={marker.icon ?? "none"}
            >
              <SelectTrigger data-testid="timeline-icon" id={id("icon")}>
                <SelectValue>{(value: string) => <TimelineIconOption icon={value} />}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {["none", ...TIMELINE_ICONS].map((icon) => (
                  <SelectItem key={icon} value={icon}>
                    <TimelineIconOption icon={icon} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Button
            data-testid="timeline-add-image"
            disabled={upload.isPending}
            onClick={addImage}
            size="sm"
            type="button"
            variant="secondary"
          >
            <ImagePlus aria-hidden="true" />
            {t("lessonTimeline.addImage")}
          </Button>
        </div>
      )}
    </div>
  );
}

// An icon's choice: the icon and its name, or "No icon".
function TimelineIconOption({ icon }: { icon: string }) {
  const { t } = useTranslation();
  const Icon = icon === "none" ? null : TIMELINE_ICON_COMPONENTS[icon as TimelineIcon];
  return (
    <span className="flex items-center gap-2">
      {Icon && <Icon aria-hidden="true" />}
      {t(`lessonTimeline.icons.${icon}`)}
    </span>
  );
}
