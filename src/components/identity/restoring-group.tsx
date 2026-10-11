import { BookOpen, Library } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { CardDescription } from "@/components/ui/card";
import { ListGroup, ListGroupContent, ListGroupHeader } from "@/components/ui/list-group";
import { ListRow, ListRowLink } from "@/components/ui/list-row";
import { Spinner } from "@/components/ui/spinner";
import { useIdentityRestoreStatusQuery } from "@/lib/publisher-identity-queries";
import { queryClient } from "@/lib/query-client";

// My courses' Restoring group (SLJ-66): while a restored publishing identity
// is looking for its courses (and programs) among the people who have them,
// which can take minutes. They're listed as they're found; the group goes away
// when the search ends, and Settings keeps the record, with "Look again".
export function RestoringGroup() {
  const { t } = useTranslation();
  const { data: status } = useIdentityRestoreStatusQuery();
  const found = (status?.courses.length ?? 0) + (status?.programs.length ?? 0);

  // Each course or program found has landed: the lists below show it too.
  useEffect(() => {
    if (found > 0) {
      void queryClient.invalidateQueries({ queryKey: ["courses"] });
      void queryClient.invalidateQueries({ queryKey: ["programs"] });
    }
  }, [found]);

  if (!status?.searching) return null;

  return (
    <ListGroup data-testid="restoring-group">
      <ListGroupHeader
        count={found}
        icon={<Spinner aria-hidden="true" />}
        title={t("identityRestore.restoringTitle")}
      />
      <ListGroupContent>
        <CardDescription className="px-3 py-1">{t("identityRestore.restoringDescription")}</CardDescription>
        {status.courses.map((course) => (
          <ListRow data-testid="restoring-course" key={course.id}>
            <BookOpen aria-hidden="true" className="size-4 shrink-0" />
            <ListRowLink render={<Link to={`/drafts/${course.id}`} />}>{course.title || course.id}</ListRowLink>
          </ListRow>
        ))}
        {status.programs.map((program) => (
          <ListRow data-testid="restoring-program" key={program.id}>
            <Library aria-hidden="true" className="size-4 shrink-0" />
            <ListRowLink render={<Link to={`/my-programs/${program.id}`} />}>{program.title || program.id}</ListRowLink>
          </ListRow>
        ))}
      </ListGroupContent>
    </ListGroup>
  );
}
