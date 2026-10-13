import { Library, Radio } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { ProgramFavoriteToggle } from "@/components/programs/program-favorite-toggle";
import { ProgramProgressIcon } from "@/components/programs/program-progress-icon";
import { Badge } from "@/components/ui/badge";
import { ListGroup, ListGroupContent, ListGroupHeader } from "@/components/ui/list-group";
import { ListRow, ListRowActions, ListRowLink, ListRowMeta } from "@/components/ui/list-row";
import { useCourseProgressQuery } from "@/lib/course-progress-queries";
import { parseCourseSearchQuery } from "@/lib/course-search-query";
import type { ProgramKind } from "@/lib/program-package";
import { useProgramsQuery } from "@/lib/program-queries";
import { useAppState } from "@/lib/use-app-state";

// Home's Programs group (SLJ-32 phase 2): programs imported with a code, each
// opening its page, with where the student is in it (like a course's row),
// how many courses its publisher added since the student last looked, and its
// star. Hidden when there are none, or the
// search matches none (`:favorites` keeps only starred programs).
// `kind: "channel"`: Home's Channels group instead (SLJ-31), the channels the
// student follows, each opening its page.
export function HomeProgramList({ kind = "program", query }: { kind?: ProgramKind; query: string }) {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const { data: programs = [] } = useProgramsQuery(locale);
  const { data: progress } = useCourseProgressQuery();
  const { favoritesOnly, text } = parseCourseSearchQuery(query);

  const imported = programs.filter(
    (program) =>
      program.distribution === "imported" &&
      program.kind === kind &&
      (!favoritesOnly || progress?.programs?.[program.id]?.favorite === true) &&
      (!text || [program.title, program.description].some((value) => value.toLowerCase().includes(text))),
  );
  if (imported.length === 0) return null;

  return (
    <ListGroup data-testid={kind === "channel" ? "home-group-channels" : "home-group-programs"}>
      <ListGroupHeader
        count={imported.length}
        icon={kind === "channel" ? <Radio aria-hidden="true" className="size-4" /> : <Library aria-hidden="true" className="size-4" />}
        title={kind === "channel" ? t("home.groups.channels") : t("home.groups.programs")}
      />
      <ListGroupContent>
        {imported.map((program) => (
          <ListRow data-testid={kind === "channel" ? "home-channel" : "home-program"} key={program.id}>
            <ProgramProgressIcon courseIds={program.courseIds} />
            {/* Above the row's stretched link, so it toggles instead of opening the program. */}
            <ListRowActions>
              <ProgramFavoriteToggle programId={program.id} />
            </ListRowActions>
            <ListRowLink render={<Link to={`/${kind === "channel" ? "channels" : "programs"}/${program.id}`} />}>
              {program.title || (kind === "channel" ? t("channels.untitled") : t("programs.untitled"))}
            </ListRowLink>
            {program.newCourseCount > 0 && (
              <Badge data-testid="home-program-new" variant="info">
                {t("programSharing.newCourses", { count: program.newCourseCount })}
              </Badge>
            )}
            <ListRowMeta align="end">{t("programs.courseCount", { count: program.courseCount })}</ListRowMeta>
          </ListRow>
        ))}
      </ListGroupContent>
    </ListGroup>
  );
}
