import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { PanelCard } from "@/components/ui/panel-card";
import { PropertyList, PropertyRow } from "@/components/ui/property-list";
import type { CourseDetails } from "@/lib/course-package";
import type { Locale } from "@/lib/i18n";
import { useSidePanelPreference } from "@/lib/explorer-panel-queries";
import { getLocaleFlag } from "@/lib/locale-flags";
import { useCourseSharingQuery } from "@/lib/sharing-queries";
import { useAppState } from "@/lib/use-app-state";
import { PageSidePanelsContext, type PageSidePanels } from "@/lib/use-page-side-panel";

const contentRatingKeys = {
  "all-ages": "contentRating.allAges",
  explicit: "contentRating.explicit",
  "mature-themes": "contentRating.matureThemes",
} as const;

// The course page's right panel: facts about the course that don't need the
// page's space. Dates show in the reader's language, with the exact time on
// hover; a fact the course doesn't record (e.g. creation date in a hand-made
// package) is left out rather than shown empty.
export function CourseInfoPanel({ course }: { course: CourseDetails }) {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const isImported = course.distribution === "imported";
  // Imported and your own courses can be shared from here; the bundled one can't.
  const { data: sharing } = useCourseSharingQuery(course.distribution === "bundled" ? undefined : course.id, {
    watchPeers: true,
  });
  const lessonCount = course.sections.reduce((count, section) => count + section.lessons.length, 0);

  return (
    <div className="p-2">
      <PanelCard title={t("courseInfo.title")}>
        <PropertyList data-testid="course-info">
          <PropertyRow label={t("courseInfo.id")} mono>
            {course.id}
          </PropertyRow>
          <PropertyRow label={t("courseInfo.version")}>{course.version}</PropertyRow>
          <DateRow date={course.versionCutAt} label={t("courseInfo.versionDate")} locale={locale} />
          {isImported && <DateRow date={sharing?.importedAt ?? null} label={t("courseInfo.imported")} locale={locale} />}
          <DateRow date={course.createdAt} label={t("courseInfo.created")} locale={locale} />
          {isImported && sharing?.versions && (
            <PropertyRow label={t("courseInfo.keptVersions")}>{sharing.versions.kept.length}</PropertyRow>
          )}
          {sharing?.peers !== null && sharing?.peers !== undefined && (
            <PropertyRow label={t("courseInfo.peersOnline")}>
              <span data-testid="course-info-peers">{sharing.peers}</span>
            </PropertyRow>
          )}
          <PropertyRow label={t("courseInfo.languages")}>
            {[...new Set(course.supportedLocales.map((supportedLocale) => getLocaleFlag(supportedLocale)))].join(" ")}
          </PropertyRow>
          <PropertyRow label={t("courseInfo.sections")}>{course.sections.length}</PropertyRow>
          <PropertyRow label={t("courseInfo.lessons")}>{lessonCount}</PropertyRow>
          <PropertyRow label={t("contentRating.label")}>{t(contentRatingKeys[course.contentRating])}</PropertyRow>
          <PropertyRow label={t("courseInfo.source")}>
            {t(`courseInfo.sources.${course.distribution}`)}
          </PropertyRow>
        </PropertyList>
      </PanelCard>
    </div>
  );
}

function DateRow({ date, label, locale }: { date: string | null; label: string; locale: Locale }) {
  if (!date || Number.isNaN(Date.parse(date))) {
    return null;
  }

  return (
    <PropertyRow label={label} title={new Date(date).toLocaleString(locale)}>
      {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(date))}
    </PropertyRow>
  );
}

// Gives the course page (`Page`, inside) its right panel: Details, open or
// closed as last left (the `courseInfoPanel` preference).
export function CourseInfoSidePanel({ children, course }: { children: ReactNode; course: CourseDetails }) {
  const { t } = useTranslation();
  const [panel, updatePanel] = useSidePanelPreference("courseInfoPanel");
  const sidePanels = useMemo<PageSidePanels>(
    () => ({
      right: {
        content: <CourseInfoPanel course={course} />,
        label: t("courseInfo.title"),
        onOpenChange: (open) => updatePanel({ open }),
        open: panel.open,
        toggleLabel: t("courseInfo.togglePanel"),
      },
    }),
    [course, panel.open, t, updatePanel],
  );

  return <PageSidePanelsContext.Provider value={sidePanels}>{children}</PageSidePanelsContext.Provider>;
}
