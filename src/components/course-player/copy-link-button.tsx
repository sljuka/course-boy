import { Check, Link2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { PlayerIconButton } from "@/components/course-player/player-icon-button";

// Copies a `matko://` link to what's open (SLJ-60), to paste into a lesson
// or send to someone who has the course. A check mark says it worked.
export function CopyLinkButton({ link }: { link: string }) {
  const { t } = useTranslation();
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    if (!hasCopied) return;
    const timer = window.setTimeout(() => setHasCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [hasCopied]);

  return (
    <PlayerIconButton
      label={hasCopied ? t("appLinks.linkCopied") : t("appLinks.copyLink")}
      onClick={() => void navigator.clipboard.writeText(link).then(() => setHasCopied(true))}
      testId="player-copy-link"
    >
      {hasCopied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
    </PlayerIconButton>
  );
}
