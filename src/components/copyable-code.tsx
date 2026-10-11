import { Check, Copy } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// A code to hand to someone (an invite, a publisher id): read-only, with a
// copy button.
export function CopyableCode({ label, testId, value }: { label: string; testId?: string; value: string }) {
  const { t } = useTranslation();
  const id = useId();
  const [hasCopied, setHasCopied] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input data-testid={testId} id={id} readOnly value={value} />
        <Button
          aria-label={t("maintainers.copyCode")}
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
