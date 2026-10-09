import { Library } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { ProgramFavoriteToggle } from "@/components/programs/program-favorite-toggle";
import { Badge } from "@/components/ui/badge";
import { CoverLogo } from "@/components/ui/cover-banner";
import { ListGroup, ListGroupContent, ListGroupHeader } from "@/components/ui/list-group";
import { ListRow, ListRowActions, ListRowLink, ListRowMeta } from "@/components/ui/list-row";
import { useCourseProgressQuery } from "@/lib/course-progress-queries";
import { parseCourseSearchQuery } from "@/lib/course-search-query";
import { programAssetUrl, useProgramsQuery } from "@/lib/program-queries";
import { useAppState } from "@/lib/use-app-state";

// Home's Programs group (SLJ-32 phase 2): programs imported with a code, each
// opening its page, with how many courses its publisher added since the
// student last looked, and its star. Hidden when there are none, or the
// search matches none (`:favorites` keeps only starred programs).
export function HomeProgramList({ query }: { query: string }) {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const { data: programs = [] } = useProgramsQuery(locale);
  const { data: progress } = useCourseProgressQuery();
  const { favoritesOnly, text } = parseCourseSearchQuery(query);

  const imported = programs.filter(
    (program) =>
      program.distribution === "imported" &&
      (!favoritesOnly || progress?.programs?.[program.id]?.favorite === true) &&
      (!text || [program.title, program.description].some((value) => value.toLowerCase().includes(text))),
  );
  if (imported.length === 0) return null;

  return (
    <ListGroup data-testid="home-group-programs">
      <ListGroupHeader
        count={imported.length}
        icon={<Library aria-hidden="true" className="size-4" />}
        title={t("home.groups.programs")}
      />
      <ListGroupContent>
        {imported.map((program) => (
          <ListRow data-testid="home-program" key={program.id}>
            {/* Above the row's stretched link, so it toggles instead of opening the program. */}
            <ListRowActions>
              <ProgramFavoriteToggle programId={program.id} />
            </ListRowActions>
            <CoverLogo size="small">
              {program.logo ? (
                <img alt="" src={programAssetUrl(program.id, program.logo)} />
              ) : (
                <Library aria-hidden="true" />
              )}
            </CoverLogo>
            <ListRowLink render={<Link to={`/programs/${program.id}`} />}>
              {program.title || t("programs.untitled")}
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
