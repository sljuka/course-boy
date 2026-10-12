import { Contact, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Page } from "@/components/page/page";
import { PublisherDialog } from "@/components/publishers/publisher-dialog";
import { PublisherRow } from "@/components/publishers/publisher-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import type { PublisherEntry } from "@/lib/publishers";
import { usePublishersQuery } from "@/lib/publishers-queries";

// Publishers (SLJ-108): the teachers and groups this profile knows by their
// Publisher ID, to invite them to maintain a course and to name them where
// the app shows them. Filled from imported courses and programs and from the
// courses you maintain together; you can add someone by hand and name anyone.
// Each row (PublisherRow): the short id with a copy button, the name (opens
// it: rename, remove), and their courses.
export function PublishersPage() {
  const { t } = useTranslation();
  const { data: publishers = [], isLoading } = usePublishersQuery();
  const [editing, setEditing] = useState<PublisherEntry | null>(null);
  const [isAdding, setIsAdding] = useState(false);

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
            <PublisherRow entry={entry} key={entry.publisherId} onOpen={() => setEditing(entry)} />
          ))}
        </div>
      )}
      {isAdding && <PublisherDialog onClose={() => setIsAdding(false)} open={isAdding} />}
      {editing && <PublisherDialog entry={editing} key={editing.publisherId} onClose={() => setEditing(null)} open />}
    </Page>
  );
}
