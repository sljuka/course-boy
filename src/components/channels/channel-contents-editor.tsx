import { BookOpen, Library } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldDescription, FieldLegend, FieldSet } from "@/components/ui/field";
import { ListRow, ListRowActions, ListRowLink, ListRowMeta } from "@/components/ui/list-row";
import type { Locale } from "@/lib/i18n";
import { localizeProgram, type ChannelProgram } from "@/lib/program-package";
import { useProgramQuery, useProgramSharingQuery, useProgramsQuery } from "@/lib/program-queries";

// What your channel shows (SLJ-31). Courses: the ones you chose with "Show on
// my channel" on each course (read fresh: main keeps that list, newest
// first). Programs: your published ones, ticked here.
export function ChannelContentsEditor({
  channelId,
  locale,
  onProgramsChange,
  programs,
}: {
  channelId: string;
  locale: Locale;
  onProgramsChange: (programs: ChannelProgram[]) => void;
  programs: ChannelProgram[];
}) {
  const { t } = useTranslation();
  const { data: channel } = useProgramQuery(channelId);
  const { data: allPrograms = [] } = useProgramsQuery(locale);
  const ownPrograms = allPrograms.filter((program) => program.distribution === "local" && program.kind === "program");
  const courses = channel?.courses ?? [];

  async function toggle(programId: string, code: string, listed: boolean) {
    if (!listed) {
      onProgramsChange(programs.filter((entry) => entry.programId !== programId));
      return;
    }
    const manifest = await window.programs.get(programId);
    onProgramsChange([...programs, { code, programId, snapshot: { locales: manifest.locales } }]);
  }

  return (
    <>
      <FieldSet>
        <FieldLegend>{t("channels.courses")}</FieldLegend>
        <FieldDescription>{t("channels.coursesHint")}</FieldDescription>
        {courses.length === 0 ? (
          <CardDescription data-testid="channel-no-courses">{t("channels.noCourses")}</CardDescription>
        ) : (
          <div className="flex flex-col">
            {courses.map((entry) => (
              <ListRow data-testid="channel-course" key={entry.courseId}>
                <BookOpen aria-hidden="true" className="size-4 shrink-0" />
                <ListRowLink render={<Link to={`/courses/${entry.courseId}`} />}>
                  {localizeProgram(
                    { defaultLocale: entry.snapshot.supportedLocales[0], locales: entry.snapshot.locales },
                    locale,
                  ).title}
                </ListRowLink>
                {entry.snapshot.version && <ListRowMeta align="end">{entry.snapshot.version}</ListRowMeta>}
              </ListRow>
            ))}
          </div>
        )}
      </FieldSet>
      <FieldSet>
        <FieldLegend>{t("channels.programs")}</FieldLegend>
        <FieldDescription>{t("channels.programsHint")}</FieldDescription>
        {ownPrograms.length === 0 ? (
          <CardDescription>{t("channels.noPrograms")}</CardDescription>
        ) : (
          <div className="flex flex-col">
            {ownPrograms.map((program) => (
              <ChannelProgramRow
                key={program.id}
                listed={programs.some((entry) => entry.programId === program.id)}
                onToggle={(code, listed) => void toggle(program.id, code, listed)}
                programId={program.id}
                title={program.title || t("programs.untitled")}
              />
            ))}
          </div>
        )}
      </FieldSet>
    </>
  );
}

// One of your programs: ticked to show it on the channel, once it has a code.
function ChannelProgramRow({
  listed,
  onToggle,
  programId,
  title,
}: {
  listed: boolean;
  onToggle: (code: string, listed: boolean) => void;
  programId: string;
  title: string;
}) {
  const { t } = useTranslation();
  const { data: sharing } = useProgramSharingQuery(programId);
  const code = sharing?.code ?? null;

  return (
    <ListRow data-testid="channel-program">
      <ListRowActions>
        <Checkbox
          aria-label={t("channels.showProgram", { title })}
          checked={listed}
          disabled={!code}
          onCheckedChange={(checked) => code && onToggle(code, checked === true)}
        />
      </ListRowActions>
      <Library aria-hidden="true" className="size-4 shrink-0" />
      <ListRowLink render={<Link to={`/my-programs/${programId}`} />}>{title}</ListRowLink>
      {!code && <ListRowMeta align="end">{t("channels.publishProgramFirst")}</ListRowMeta>}
    </ListRow>
  );
}
