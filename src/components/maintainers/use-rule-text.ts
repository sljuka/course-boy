import { useTranslation } from "react-i18next";

// A rule as a count of approvals: "2 of 3 approvals required" (SLJ-11).
export function useRuleText() {
  const { t } = useTranslation();
  return (quorum: number, count: number) => t("maintainers.rule", { count, quorum });
}
