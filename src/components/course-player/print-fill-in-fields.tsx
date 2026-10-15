import { useTranslation } from "react-i18next";

import { FillInLine } from "@/components/ui/fill-in-line";

// Blank "Name:" and "Date:" lines at the top of a printout, for the student
// to fill in by hand (SLJ-143). Printed only, under the header (or at the
// top without it), once: the first page. Name wide, date shorter beside it.
export function PrintFillInFields({ showDate, showName }: { showDate: boolean; showName: boolean }) {
  const { t } = useTranslation();

  if (!showName && !showDate) {
    return null;
  }

  return (
    <div className="mb-6 hidden gap-8 print:flex" data-testid="print-fill-in-fields">
      {showName && (
        <FillInLine className="flex-[2]" data-testid="print-name-field" label={t("courseDetails.printNameLabel")} />
      )}
      {showDate && (
        <FillInLine className="flex-1" data-testid="print-date-field" label={t("courseDetails.printDateLabel")} />
      )}
    </div>
  );
}
