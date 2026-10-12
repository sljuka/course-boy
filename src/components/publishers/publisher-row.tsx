import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ListRow, ListRowActions, ListRowLink, ListRowMeta } from "@/components/ui/list-row";
import { shortPublisherId } from "@/lib/maintainers-queries";
import type { PublisherEntry, PublisherSource } from "@/lib/publishers";

// How many of a publisher's courses show in the row before "and N more".
const SHOWN_SOURCES = 2;

// One publisher in Publishers (SLJ-108), left to right: the Publisher ID
// shortened, with a button that copies it whole; the name, or "No name"
// (opens it: rename, remove); and why they're here, the first two, with
// "and N more" growing the row to list the rest under them.
export function PublisherRow({ entry, onOpen }: { entry: PublisherEntry; onOpen: () => void }) {
  const { t } = useTranslation();
  const [hasCopied, setHasCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  // Just the course and program names; "Added by you" for one entered by hand.
  // A course both imported and maintained shows once.
  const sourceText = (source: PublisherSource) => (source.kind === "manual" ? t("publishers.addedByYou") : source.title);
  const names = [...new Set(entry.sources.map(sourceText))];
  const shown = names.slice(0, SHOWN_SOURCES);
  const rest = names.slice(SHOWN_SOURCES);

  return (
    <Collapsible data-testid="publisher" onOpenChange={setIsOpen} open={isOpen}>
      {/* Wraps so the rest of the courses take a line of their own inside
          the row; py-2 keeps the first line at the row's usual height. */}
      <ListRow className="h-auto min-h-10 flex-wrap gap-y-0 py-2">
        <ListRowMeta className="w-20" data-testid="publisher-short-id" title={entry.publisherId}>
          {t("publishers.shortId", { id: shortPublisherId(entry.publisherId) })}
        </ListRowMeta>
        <ListRowActions>
          <Button
            aria-label={t("publishers.copyId")}
            data-testid="publisher-copy-id"
            onClick={() => void navigator.clipboard.writeText(entry.publisherId).then(() => setHasCopied(true))}
            size="icon-xs"
            variant="ghost"
          >
            {hasCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          </Button>
        </ListRowActions>
        <ListRowLink className="w-48 flex-none" data-testid="publisher-name" render={<button onClick={onOpen} type="button" />}>
          {entry.label ?? entry.claimedName ?? t("publishers.noName")}
        </ListRowLink>
        <ListRowMeta data-testid="publisher-sources" fill>
          {shown.length === 2 ? t("publishers.twoSources", { first: shown[0], second: shown[1] }) : shown[0]}
        </ListRowMeta>
        {rest.length > 0 && (
          <ListRowActions>
            <CollapsibleTrigger data-testid="publisher-more">{t("publishers.more", { count: rest.length })}</CollapsibleTrigger>
          </ListRowActions>
        )}
        {/* Only while open: an empty full-width line would still add height.
            pl-83 lines the list up under the courses column (w-20, the
            copy button, w-48, and the gaps between them). */}
        {isOpen && (
          <div className="basis-full">
            <CollapsibleContent className="gap-1 pt-1 pl-83">
              {rest.map((name) => (
                <ListRowMeta data-testid="publisher-source" key={name}>
                  {name}
                </ListRowMeta>
              ))}
            </CollapsibleContent>
          </div>
        )}
      </ListRow>
    </Collapsible>
  );
}
