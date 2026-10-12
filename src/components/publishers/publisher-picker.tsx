import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { shortPublisherId } from "@/lib/maintainers-queries";
import { usePublishersQuery } from "@/lib/publishers-queries";

// Picks someone from Publishers (SLJ-108), the address book, by name: sets
// their Publisher ID. Not shown while the address book is empty.
export function PublisherPicker({
  disabled = false,
  onPick,
  value,
}: {
  disabled?: boolean;
  onPick: (publisherId: string) => void;
  // The Publisher ID entered so far: shown as picked when it's in the book.
  value: string;
}) {
  const { t } = useTranslation();
  const { data: publishers = [] } = usePublishersQuery();
  if (publishers.length === 0) return null;
  const picked = publishers.find((entry) => entry.publisherId === value.trim()) ?? null;
  const nameOf = (entry: (typeof publishers)[number]) =>
    entry.label ? `${entry.label} (${shortPublisherId(entry.publisherId)})` : shortPublisherId(entry.publisherId);

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{t("publishers.pickLabel")}</Label>
      <Select disabled={disabled} onValueChange={(next) => onPick(String(next))} value={picked?.publisherId ?? ""}>
        <SelectTrigger className="w-full" data-testid="publisher-picker">
          <SelectValue>{picked ? nameOf(picked) : t("publishers.pickPlaceholder")}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {publishers.map((entry) => (
            <SelectItem key={entry.publisherId} value={entry.publisherId}>
              {nameOf(entry)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
