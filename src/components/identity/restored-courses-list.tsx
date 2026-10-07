import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { FieldDescription } from "@/components/ui/field";
import { ListRow, ListRowMeta } from "@/components/ui/list-row";
import { Spinner } from "@/components/ui/spinner";
import { StatusIcon } from "@/components/ui/status-icon";
import type { IdentityRestoreStatus } from "@/lib/publisher-identity";
import { useSearchRestoredCoursesMutation } from "@/lib/publisher-identity-queries";

// The courses a restored publishing identity found again (SLJ-54, SLJ-55), one
// row each, while the search among students runs and after it. A course comes
// back only while a student who has it is online, so "Look again" searches
// once more.
export function RestoredCoursesList({ status }: { status: NonNullable<IdentityRestoreStatus> }) {
  const { t } = useTranslation();
  const searchMutation = useSearchRestoredCoursesMutation();

  return (
    <div className="flex flex-col gap-2" data-testid="restored-courses">
      <div className="flex flex-col">
        {status.courses.map((course) => (
          <ListRow data-testid="restored-course" key={course.id}>
            <StatusIcon status="published" />
            <span className="min-w-0 flex-1 truncate">{course.title || course.id}</span>
            <ListRowMeta>{t("identityRestore.courseRestored")}</ListRowMeta>
          </ListRow>
        ))}
      </div>
      {status.searching ? (
        <FieldDescription className="flex items-center gap-2" data-testid="restore-searching">
          <Spinner aria-hidden="true" />
          {t("identityRestore.searching")}
        </FieldDescription>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <FieldDescription>
            {status.courses.length === 0 ? t("identityRestore.foundNone") : t("identityRestore.foundMore")}
          </FieldDescription>
          <Button
            data-testid="restore-look-again"
            disabled={searchMutation.isPending}
            onClick={() => searchMutation.mutate()}
            size="sm"
            variant="secondary"
          >
            {t("identityRestore.lookAgain")}
          </Button>
        </div>
      )}
    </div>
  );
}
