import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { importAppLink } from "@/lib/app-links";

// One thing to copy: its label, the read-only text and a copy button that
// shows a check mark for a moment.
function CopyRow({ label, multiline = false, testId, value }: { label: string; multiline?: boolean; testId: string; value: string }) {
  const { t } = useTranslation();
  const [hasCopied, setHasCopied] = useState(false);
  const id = `share-${testId}`;

  useEffect(() => {
    if (!hasCopied) return;
    const timer = window.setTimeout(() => setHasCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [hasCopied]);

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex min-w-0 items-start gap-2">
        {multiline ? (
          // A fixed size, not grown to the text: the link has no spaces, and
          // grown to it the box would widen the whole dialog. It wraps instead.
          <Textarea
            className="field-sizing-fixed min-w-0 flex-1 resize-none"
            data-testid={testId}
            id={id}
            readOnly
            rows={4}
            value={value}
          />
        ) : (
          <Input className="min-w-0 flex-1" data-testid={testId} id={id} readOnly value={value} />
        )}
        <Button
          aria-label={t("shareCode.copy", { what: label })}
          data-testid={`${testId}-copy`}
          onClick={() => void navigator.clipboard.writeText(value).then(() => setHasCopied(true))}
          size="icon"
          variant="secondary"
        >
          {hasCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        </Button>
      </div>
    </div>
  );
}

// What a teacher hands out for a course or program (SLJ-8): its code, a
// `matko://import/…` link that opens Import with it filled in, and a message
// with both, since many chat apps don't make a `matko://` link clickable.
// `testId`: the code field's (course-code, program-code).
export function ShareCodeFields({ code, codeLabel, testId }: { code: string; codeLabel: string; testId: string }) {
  const { t } = useTranslation();
  const link = importAppLink(code);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <CopyRow label={t("shareCode.link")} testId="share-link" value={link} />
      <CopyRow label={codeLabel} testId={testId} value={code} />
      <CopyRow label={t("shareCode.message")} multiline testId="share-message" value={t("shareCode.messageText", { code, link })} />
    </div>
  );
}
