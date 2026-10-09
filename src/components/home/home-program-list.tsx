import { Library } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { CoverLogo } from "@/components/ui/cover-banner";
import { ListGroup, ListGroupContent, ListGroupHeader } from "@/components/ui/list-group";
import { ListRow, ListRowLink, ListRowMeta } from "@/components/ui/list-row";
import { parseCourseSearchQuery } from "@/lib/course-search-query";
import { programAssetUrl, useProgramsQuery } from "@/lib/program-queries";
import { useAppState } from "@/lib/use-app-state";

// Home's Programs group (SLJ-32 phase 2): programs imported with a code, each
// opening its page, with how many courses its publisher added since the
// student last looked. Hidden when there are none (or the search matches
// none; starring programs comes later, so `:favorites` hides them).
export function HomeProgramList({ query }: { query: string }) {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const { data: programs = [] } = useProgramsQuery(locale);
  const { favoritesOnly, text } = parseCourseSearchQuery(query);

  const imported = programs.filter(
    (program) =>
      program.distribution === "imported" &&
      !favoritesOnly &&
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
