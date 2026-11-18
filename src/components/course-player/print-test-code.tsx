import { useTranslation } from "react-i18next";

// The test's code (SLJ-232), small at the top right of a printed sheet, so the
// teacher can type it in later to rebuild exactly this sheet and its answers.
// Printed only.
export function PrintTestCode({ code, show }: { code: string | null; show: boolean }) {
  const { t } = useTranslation();

  if (!show || !code) {
    return null;
  }

  return (
    <div className="mb-2 hidden text-right text-xs text-muted-foreground print:block" data-testid="print-test-code">
      {t("testCode.printed", { code })}
    </div>
  );
}
