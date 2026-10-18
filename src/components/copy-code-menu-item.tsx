import { Copy } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ContextMenuItem } from "@/components/ui/context-menu";
import { useProgramSharingQuery } from "@/lib/program-queries";
import { useCourseSharingQuery } from "@/lib/sharing-queries";

// "Copy code" in a course's, program's or channel's context menu: the code
// students import it with (the same for every version). Only for one that has
// a code (published, or imported); a draft never published has none. Lives
// inside the menu, so its sharing query runs only while a menu is open, not
// for every row of a list.
export function CourseCopyCodeItem({ courseId }: { courseId: string }) {
  const { data: sharing } = useCourseSharingQuery(courseId);
  return <CopyCodeItem code={sharing?.code ?? null} />;
}

export function ProgramCopyCodeItem({ programId }: { programId: string }) {
  const { data: sharing } = useProgramSharingQuery(programId);
  return <CopyCodeItem code={sharing?.code ?? null} />;
}

function CopyCodeItem({ code }: { code: string | null }) {
  const { t } = useTranslation();
  if (!code) return null;
  return (
    <ContextMenuItem data-testid="copy-code" onClick={() => void navigator.clipboard.writeText(code)}>
      <Copy aria-hidden="true" />
      {t("appLinks.copyCode")}
    </ContextMenuItem>
  );
}
