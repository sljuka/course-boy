import { useTranslation } from "react-i18next";

import { InfoTooltip } from "@/components/ui/info-tooltip";

// How many people this computer is connected to for a course or program,
// said as a lower bound with a (?) saying why: most people get it from each
// other and never connect here, so more are online than the count shows
// (measured in docs/pear-integration-notes.md, "Peers online").
// `variant`: "labelled" ("Connected: at least 3") on its own line, "value"
// ("At least 3") next to a label that already says what it counts.
export function PeersCount({
  count,
  testId,
  variant = "labelled",
}: {
  count: number;
  testId?: string;
  variant?: "labelled" | "value";
}) {
  const { t } = useTranslation();
  const text =
    count === 0
      ? t("peers.none")
      : variant === "labelled"
        ? t("peers.connectedAtLeast", { count })
        : t("peers.atLeast", { count });

  return (
    <span className="inline-flex items-center gap-1" data-count={count} data-testid={testId}>
      {text}
      <InfoTooltip aria-label={t("peers.whyLabel")}>{t("peers.why")}</InfoTooltip>
    </span>
  );
}
