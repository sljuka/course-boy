import { useTranslation } from "react-i18next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { ListRow, ListRowMeta } from "@/components/ui/list-row";
import { Progress } from "@/components/ui/progress";
import { Stat, StatGroup, StatHint, StatLabel, StatValue } from "@/components/ui/stat";
import { ACTIVITY_BANDS, type ActivitySummary } from "@/lib/course-activity";

// A course's Activity tab (SLJ-168), on the teacher's editor: about how many
// students imported, started and finished it, how far they got through each
// section, how much they had done on reaching the end, and how many went
// through it again. First attempts unless said otherwise. Estimates: each
// device counts once, and anyone can make up a device.
export function CourseActivityPanel({
  collect,
  sections,
  summary,
}: {
  collect: boolean;
  sections: { id: string; title: string }[];
  summary: ActivitySummary;
}) {
  const { t } = useTranslation();
  const approx = (count: number) => t("courseActivity.approx", { value: count });
  const firstEnd = summary.reachedEnd[0];
  const reachedEnd = firstEnd ? ACTIVITY_BANDS.reduce((sum, band) => sum + firstEnd[band], 0) : 0;
  const repeats = summary.finished.slice(1);
  // Bars are relative to how many started.
  const share = (count: number) => (summary.started > 0 ? Math.min(100, (count / summary.started) * 100) : 0);

  return (
    <div className="flex flex-col gap-6" data-testid="course-activity">
      {!collect && (
        <Alert data-testid="course-activity-off" variant="info">
          <AlertDescription>{t("courseActivity.off")}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <StatGroup>
          <Stat data-testid="activity-imported">
            <StatLabel>{t("courseActivity.imported")}</StatLabel>
            <StatValue>{approx(summary.imported)}</StatValue>
          </Stat>
          <Stat data-testid="activity-started">
            <StatLabel>{t("courseActivity.started")}</StatLabel>
            <StatValue>{approx(summary.started)}</StatValue>
          </Stat>
          <Stat data-testid="activity-finished">
            <StatLabel>{t("courseActivity.finished")}</StatLabel>
            <StatValue>{approx(summary.finished[0] ?? 0)}</StatValue>
            {(repeats[0] ?? 0) > 0 && <StatHint>{t("courseActivity.finishedAgain", { value: repeats[0] })}</StatHint>}
          </Stat>
          <Stat data-testid="activity-reached-end">
            <StatLabel>{t("courseActivity.reachedEnd")}</StatLabel>
            <StatValue>{approx(reachedEnd)}</StatValue>
          </Stat>
        </StatGroup>
        <CardDescription>{t("courseActivity.estimates")}</CardDescription>
      </div>

      {sections.length > 0 && (
        <section className="flex flex-col gap-2">
          <CardTitle>{t("courseActivity.sectionsTitle")}</CardTitle>
          <div className="flex flex-col">
            {sections.map((section) => {
              const count = summary.sections[section.id]?.[0] ?? 0;
              return (
                <ListRow data-testid="activity-section" key={section.id}>
                  <span className="min-w-0 flex-1 truncate">{section.title}</span>
                  <Progress className="w-32 shrink-0" value={share(count)} />
                  <ListRowMeta align="end" className="w-14" emphasized>
                    {approx(count)}
                  </ListRowMeta>
                </ListRow>
              );
            })}
          </div>
        </section>
      )}

      {firstEnd && (
        <section className="flex flex-col gap-2">
          <CardTitle>{t("courseActivity.endTitle")}</CardTitle>
          <CardDescription>{t("courseActivity.endDescription")}</CardDescription>
          <div className="flex flex-col">
            {[...ACTIVITY_BANDS].reverse().map((band) => (
              <ListRow data-testid="activity-band" key={band}>
                <span className="min-w-0 flex-1 truncate">{t(`courseActivity.bands.${band}`)}</span>
                <Progress className="w-32 shrink-0" value={reachedEnd > 0 ? (firstEnd[band] / reachedEnd) * 100 : 0} />
                <ListRowMeta align="end" className="w-14" emphasized>
                  {approx(firstEnd[band])}
                </ListRowMeta>
              </ListRow>
            ))}
          </div>
        </section>
      )}

      {repeats.length > 0 && (
        <section className="flex flex-col gap-2">
          <CardTitle>{t("courseActivity.attemptsTitle")}</CardTitle>
          <CardDescription>{t("courseActivity.attemptsDescription")}</CardDescription>
          <div className="flex flex-col">
            {summary.finished.map((count, index) => (
              <ListRow data-testid="activity-attempt" key={index}>
                <span className="min-w-0 flex-1 truncate">
                  {index === 4 ? t("courseActivity.attemptMore") : t("courseActivity.attempt", { number: index + 1 })}
                </span>
                <ListRowMeta align="end" className="w-14" emphasized>
                  {approx(count)}
                </ListRowMeta>
              </ListRow>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
