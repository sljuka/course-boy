import { useTranslation } from "react-i18next";

import type { CoursePublisher } from "@/lib/publishers";
import { usePublisherDisplay } from "@/lib/publishers-queries";

// Who made something, the same way everywhere: "Ana (4y9dgb89…)" with a name
// (the one you gave them in Publishers, else the one their course or program
// carries: `name`), "4y9dgb89…" without. The full Publisher ID on hover: a
// name proves nothing, the ID is who they are.
export function PublisherName({
  name = null,
  publisherId,
  testId,
}: {
  name?: string | null;
  publisherId: string;
  testId?: string;
}) {
  const display = usePublisherDisplay();
  return (
    <span data-testid={testId} title={publisherId}>
      {display(publisherId, name)}
    </span>
  );
}

// "by Ana (4y9dgb89…), Marko (k3x8…)": everyone who published something, its
// publisher first. `withBy: false` for a labelled field ("Published by").
export function PublishedBy({
  publishers,
  testId,
  withBy = true,
}: {
  publishers: CoursePublisher[];
  testId?: string;
  withBy?: boolean;
}) {
  const { t } = useTranslation();
  const display = usePublisherDisplay();
  if (publishers.length === 0) return null;
  const names = publishers
    .map((publisher) => display(publisher.publisherId, publisher.name))
    .reduce((joined, next) => t("publishers.twoSources", { first: joined, second: next }));
  return (
    <span data-testid={testId} title={publishers.map((publisher) => publisher.publisherId).join("\n")}>
      {withBy ? t("publishers.by", { name: names }) : names}
    </span>
  );
}
