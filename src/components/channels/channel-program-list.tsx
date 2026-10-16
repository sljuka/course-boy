import { Download, Library } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { ProgramContextMenu } from "@/components/programs/program-context-menu";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { ListRow, ListRowActions, ListRowLink, ListRowMeta } from "@/components/ui/list-row";
import { Spinner } from "@/components/ui/spinner";
import { localizeProgram, type ChannelProgram } from "@/lib/program-package";
import { useProgramsQuery } from "@/lib/program-queries";
import type { PendingImport } from "@/lib/sharing-queries";
import { useAppState } from "@/lib/use-app-state";
import { useNewTabLink } from "@/lib/use-new-tab-link";

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
          const row = (
            <ListRow data-testid="channel-program-entry">
              <Library aria-hidden="true" className="size-4 shrink-0" />
              {here ? (
                <ProgramLink programId={entry.programId}>{title}</ProgramLink>
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
          // Right-click once it's here (SLJ-12): Open in new tab and its star.
          return here ? (
            <ProgramContextMenu href={`/programs/${entry.programId}`} key={entry.programId} programId={entry.programId}>
              {row}
            </ProgramContextMenu>
          ) : (
            <Fragment key={entry.programId}>{row}</Fragment>
          );
        })}
      </div>
    </div>
  );
}

// A program's title on a channel's page: a plain click opens it, a
// middle-click or ⌘-click in a new tab (SLJ-12).
function ProgramLink({ children, programId }: { children: ReactNode; programId: string }) {
  const href = `/programs/${programId}`;
  const newTabLink = useNewTabLink(href);
  return <ListRowLink render={<Link to={href} {...newTabLink} />}>{children}</ListRowLink>;
}
