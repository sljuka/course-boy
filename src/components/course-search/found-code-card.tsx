import { useTranslation } from "react-i18next";

import { PublisherName } from "@/components/publishers/publisher-name";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { PropertyList, PropertyRow } from "@/components/ui/property-list";
import { getContentRatingLabelKey } from "@/lib/course-utils";
import { isLocale, type Locale } from "@/lib/i18n";
import { getLocaleFlag } from "@/lib/locale-flags";
import type { ContentRating } from "@/lib/course-package";
import type { FoundCode } from "@/lib/sharing";
import { transferErrorText } from "@/lib/transfer-errors";
import { formatBytes } from "@/lib/transfer-progress";

// Above this, the card asks the student to check it's what they expected
// (SLJ-153). Courses with video are legitimately this big; the hard limits
// are in workers/download-limits.cjs.
const LARGE_DOWNLOAD_BYTES = 1024 ** 3;

const CONTENT_RATINGS = ["all-ages", "mature-themes", "explicit"];

// What a code turned out to be, before importing it (SLJ-153): its title and
// description, who published it (with a note when it's someone the student
// hasn't imported from before: a name proves nothing, the Publisher ID is
// who it is), and what importing it would bring. So "the link said Math 5"
// can be checked against what the code really is, and a hostile course shows
// as something unexpected before anything of it is downloaded.
export function FoundCodeCard({
  found,
  isKnownPublisher,
  locale,
}: {
  found: Extract<FoundCode, { status: "found" }>;
  isKnownPublisher: boolean;
  locale: Locale;
}) {
  const { t } = useTranslation();
  const localized = found.locales[locale] ?? found.locales[found.supportedLocales[0] ?? ""] ?? Object.values(found.locales)[0];
  const contents = found.contents;
  const languages = found.supportedLocales.filter(isLocale);

  return (
    <div className="flex flex-col gap-3" data-testid="found-code">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{t(`importCourse.find.kind.${found.kind}`)}</Badge>
          <CardTitle data-testid="found-code-title">{localized?.title || t("importCourse.find.untitled")}</CardTitle>
        </div>
        {localized?.description && <CardDescription className="line-clamp-3">{localized.description}</CardDescription>}
      </div>

      {/* The facts in a card of their own, set apart from the title above. */}
      <Card size="sm">
        <CardContent>
          <PropertyList className="px-0">
            <PropertyRow label={t("importCourse.find.publisher")}>
              {found.publisherId ? (
                <PublisherName name={found.publisherName} publisherId={found.publisherId} testId="found-code-publisher" />
              ) : (
                t("importCourse.find.noPublisher")
              )}
            </PropertyRow>
            {found.version && <PropertyRow label={t("importCourse.find.version")}>{found.version}</PropertyRow>}
            {languages.length > 0 && (
              <PropertyRow label={t("importCourse.find.languages")}>
                {[...new Set(languages.map(getLocaleFlag))].join(" ")}
              </PropertyRow>
            )}
            {found.contentRating && CONTENT_RATINGS.includes(found.contentRating) && (
              <PropertyRow label={t("contentRating.label")}>
                {t(`contentRating.${getContentRatingLabelKey(found.contentRating as ContentRating)}`)}
              </PropertyRow>
            )}
            <PropertyRow label={t("importCourse.find.contents")}>
              <span data-testid="found-code-contents">
                {found.kind === "course"
                  ? contents
                    ? t("importCourse.find.courseContents", {
                        lessons: contents.lessons,
                        sections: contents.sections,
                        tests: contents.tests,
                      })
                    : t("importCourse.find.unknown")
                  : t("importCourse.find.courses", { count: found.courseCount ?? 0 })}
              </span>
            </PropertyRow>
            <PropertyRow label={t("importCourse.find.size")}>
              <span data-testid="found-code-size">
                {contents?.bytes != null && contents.files != null
                  ? t("importCourse.find.sizeValue", { files: contents.files, size: formatBytes(contents.bytes, locale) })
                  : t("importCourse.find.unknown")}
              </span>
            </PropertyRow>
          </PropertyList>
        </CardContent>
      </Card>

      {contents?.limit && (
        <Alert data-testid="found-code-over-limit" variant="destructive">
          <AlertDescription>{transferErrorText(new Error(`${contents.limit}:`), t)}</AlertDescription>
        </Alert>
      )}
      {contents?.bytes != null && contents.bytes > LARGE_DOWNLOAD_BYTES && (
        <Alert data-testid="found-code-large" variant="warning">
          <AlertDescription>
            {t("importCourse.find.large", { size: formatBytes(contents.bytes, locale) })}
          </AlertDescription>
        </Alert>
      )}
      {found.publisherId && !isKnownPublisher && (
        <Alert data-testid="found-code-new-publisher" variant="info">
          <AlertDescription>{t("importCourse.find.newPublisher")}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
