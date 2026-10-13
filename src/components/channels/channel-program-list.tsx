import { Download, Library } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { ListRow, ListRowActions, ListRowLink, ListRowMeta } from "@/components/ui/list-row";
import { Spinner } from "@/components/ui/spinner";
import { localizeProgram, type ChannelProgram } from "@/lib/program-package";
import { useProgramsQuery } from "@/lib/program-queries";
import type { PendingImport } from "@/lib/sharing-queries";
import { useAppState } from "@/lib/use-app-state";

// A channel's programs (SLJ-31), on its page: each opens once it's here, or
// is brought here by its code, like a program's courses.
export function ChannelProgramList({
  entries,
  onImport,
  pendingFor,
}: {
  entries: ChannelProgram[];
  onImport: (code: string) => void;
  pendingFor: (code: string | null) => PendingImport | undefined;
}) {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const { data: programs = [] } = useProgramsQuery(locale);

  return (
    <div className="flex flex-col gap-2" data-testid="channel-programs">
      <CardTitle>{t("channels.programs")}</CardTitle>
      <div className="flex flex-col">
        {entries.map((entry) => {
          const here = programs.find((program) => program.id === entry.programId);
          const pending = pendingFor(entry.code);
          const title =
            here?.title ||
            localizeProgram({ defaultLocale: locale, locales: entry.snapshot.locales }, locale).title ||
            Object.values(entry.snapshot.locales)[0]?.title ||
            t("programs.untitled");
          return (
            <ListRow data-testid="channel-program-entry" key={entry.programId}>
              <Library aria-hidden="true" className="size-4 shrink-0" />
              {here ? (
                <ListRowLink render={<Link to={`/programs/${entry.programId}`} />}>{title}</ListRowLink>
              ) : (
                <ListRowMeta emphasized fill>
                  {title}
                </ListRowMeta>
              )}
              {here && <ListRowMeta align="end">{t("programs.courseCount", { count: here.courseCount })}</ListRowMeta>}
              {!here && (
                <ListRowActions>
                  <Button
                    data-testid="channel-program-import"
                    disabled={Boolean(pending)}
                    onClick={() => onImport(entry.code)}
                    size="xs"
                    variant="secondary"
                  >
                    {pending ? <Spinner aria-hidden="true" /> : <Download aria-hidden="true" />}
                    {t("channels.getProgram")}
                  </Button>
                </ListRowActions>
              )}
            </ListRow>
          );
        })}
      </div>
    </div>
  );
}
