import { Contact, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Page } from "@/components/page/page";
import { PublisherDialog } from "@/components/publishers/publisher-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { ListRow, ListRowLink, ListRowMeta } from "@/components/ui/list-row";
import { shortPublisherId } from "@/lib/maintainers-queries";
import type { PublisherEntry, PublisherSource } from "@/lib/publishers";
import { usePublishersQuery } from "@/lib/publishers-queries";

// Publishers (SLJ-108): the teachers and groups this profile knows by their
// Publisher ID, to invite them to maintain a course and to name them where
// the app shows them. Filled from imported courses and programs and from the
// courses you maintain together; you can add someone by hand and name anyone.
// A row opens it (copy the id, rename, remove).
export function PublishersPage() {
  const { t } = useTranslation();
  const { data: publishers = [], isLoading } = usePublishersQuery();
  const [editing, setEditing] = useState<PublisherEntry | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const sourceText = (source: PublisherSource) =>
    source.kind === "manual"
      ? t("publishers.addedByYou")
      : source.kind === "maintainer"
        ? t("publishers.maintainsWithYou", { title: source.title })
        : source.kind === "program"
          ? t("publishers.importedProgram", { title: source.title })
          : t("publishers.importedCourse", { title: source.title });

  return (
    <Page
      breadcrumbs={[{ icon: Contact, label: t("sidebar.publishers") }]}
      header={
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle size="lg">{t("publishers.title")}</CardTitle>
            <CardDescription className="max-w-3xl">{t("publishers.description")}</CardDescription>
          </div>
          <Button data-testid="add-publisher" onClick={() => setIsAdding(true)} size="sm">
            <Plus aria-hidden="true" />
            {t("publishers.add")}
          </Button>
        </div>
      }
    >
      {!isLoading && publishers.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <CardDescription>{t("publishers.empty")}</CardDescription>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col" data-testid="publishers-list">
          {publishers.map((entry) => (
            <ListRow data-testid="publisher" key={entry.publisherId}>
              <ListRowLink render={<button onClick={() => setEditing(entry)} type="button" />}>
                {entry.label ?? t("publishers.noName")}
              </ListRowLink>
              <ListRowMeta>{shortPublisherId(entry.publisherId)}</ListRowMeta>
              <ListRowMeta align="end" className="max-w-[50%]" fill>
                {entry.sources.length > 1
                  ? t("publishers.sourceAndMore", { count: entry.sources.length - 1, source: sourceText(entry.sources[0]) })
                  : entry.sources[0] && sourceText(entry.sources[0])}
              </ListRowMeta>
            </ListRow>
          ))}
        </div>
      )}
      {isAdding && <PublisherDialog onClose={() => setIsAdding(false)} open={isAdding} />}
      {editing && <PublisherDialog entry={editing} key={editing.publisherId} onClose={() => setEditing(null)} open />}
    </Page>
  );
}
