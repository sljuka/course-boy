import { useTranslation } from "react-i18next";

import { PublisherName } from "@/components/publishers/publisher-name";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Locale } from "@/lib/i18n";
import type { PeekCourseResult } from "@/lib/program-package";

// What a code from a link turned out to be (SLJ-151), looked up from people
// sharing it before anything downloads: the course's title, who published it
// (name and Publisher ID: the name alone proves nothing) and its version. So
// "the link said Math 5" can be checked against what the code really is.
export function LinkedCoursePreview({
  error,
  locale,
  result,
}: {
  error: Error | null;
  locale: Locale;
  result: PeekCourseResult | undefined;
}) {
  const { t } = useTranslation();

  if (error) {
    // Not a course: it may be a program's code, which Import shows on its own.
    return (
      <Alert data-testid="linked-course-preview" variant="warning">
        <AlertDescription>{t("importCourse.lookUpNotCourse")}</AlertDescription>
      </Alert>
    );
  }

  if (!result) return null;

  if ("notFound" in result) {
    return (
      <Alert data-testid="linked-course-preview" variant="warning">
        <AlertDescription>{t("importCourse.lookUpNotFound")}</AlertDescription>
      </Alert>
    );
  }

  const { snapshot } = result.course;
  const localized = snapshot.locales[locale] ?? snapshot.locales[snapshot.supportedLocales[0]];
  return (
    <Alert data-testid="linked-course-preview" variant="info">
      <AlertTitle>{localized?.title ?? t("importCourse.lookUpUntitled")}</AlertTitle>
      <AlertDescription>
        {snapshot.publisherId ? (
          <span>
            {t("importCourse.lookUpBy")}{" "}
            <PublisherName name={snapshot.publisherName} publisherId={snapshot.publisherId} />
          </span>
        ) : (
          t("importCourse.lookUpNoPublisher")
        )}
        {snapshot.version && <span> · {t("importCourse.lookUpVersion", { version: snapshot.version })}</span>}
      </AlertDescription>
    </Alert>
  );
}
