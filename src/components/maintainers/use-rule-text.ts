import { useTranslation } from "react-i18next";

// A rule said as people, not a number: "Both of you", "All 3 of you", "Any 2
// of 3" (SLJ-11).
export function useRuleText() {
  const { t } = useTranslation();
  return (quorum: number, count: number) =>
    quorum === count
      ? count === 2
        ? t("maintainers.ruleBoth")
        : t("maintainers.ruleAll", { count })
      : t("maintainers.ruleSome", { count, quorum });
}
