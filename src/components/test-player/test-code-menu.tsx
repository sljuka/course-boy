import { Check, Copy, Dices, KeyRound, Shuffle, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { ApplyTestCodeResult } from "@/components/test-player/use-test-player-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

// Shown as the example of what a code looks like.
const EXAMPLE_CODE = "K7QM-2XDP";

// The test code's menu in the player's action bar (SLJ-232), the dice: this
// attempt's code (click to copy), Randomize (a new attempt with a new code)
// and Enter code (rebuild the attempt a code was made for). Both start the
// test again, so they ask first when something was already answered.
export function TestCodeMenu({
  code,
  hasProgress,
  onApplyCode,
  onRandomize,
}: {
  code: string;
  hasProgress: boolean;
  onApplyCode: (text: string) => ApplyTestCodeResult;
  onRandomize: () => void;
}) {
  const { t } = useTranslation();
  const [hasCopied, setHasCopied] = useState(false);
  const [isConfirmingRandomize, setIsConfirmingRandomize] = useState(false);
  const [isEnteringCode, setIsEnteringCode] = useState(false);

  useEffect(() => {
    if (!hasCopied) return;
    const timer = window.setTimeout(() => setHasCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [hasCopied]);

  function randomize() {
    if (hasProgress) {
      setIsConfirmingRandomize(true);
      return;
    }
    onRandomize();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label={t("testCode.menu")}
              data-testid="test-code-menu"
              shape="circle"
              size="icon-sm"
              variant="subtle"
            />
          }
        >
          <Dices aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("testCode.menu")}</DropdownMenuLabel>
            <DropdownMenuItem
              aria-label={t("testCode.copy", { code })}
              closeOnClick={false}
              data-testid="test-code"
              onClick={() => void navigator.clipboard.writeText(code).then(() => setHasCopied(true))}
            >
              {hasCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              <span>{code}</span>
              {hasCopied && <span>{t("testCode.copied")}</span>}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem data-testid="test-code-randomize" onClick={randomize}>
            <Shuffle aria-hidden="true" />
            {t("testCode.randomize")}
          </DropdownMenuItem>
          <DropdownMenuItem data-testid="test-code-enter" onClick={() => setIsEnteringCode(true)}>
            <KeyRound aria-hidden="true" />
            {t("testCode.enterCode")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RandomizeDialog
        onConfirm={() => {
          setIsConfirmingRandomize(false);
          onRandomize();
        }}
        onOpenChange={setIsConfirmingRandomize}
        open={isConfirmingRandomize}
      />
      {/* Mounted only while open, so it starts empty every time. */}
      {isEnteringCode && (
        <EnterCodeDialog
          hasProgress={hasProgress}
          onApplyCode={onApplyCode}
          onClose={() => setIsEnteringCode(false)}
        />
      )}
    </>
  );
}

// The answers so far are lost when the test starts again.
function DiscardWarning() {
  const { t } = useTranslation();

  return (
    <Alert variant="warning">
      <TriangleAlert aria-hidden="true" />
      <AlertDescription>{t("testCode.discardWarning")}</AlertDescription>
    </Alert>
  );
}

function RandomizeDialog({
  onConfirm,
  onOpenChange,
  open,
}: {
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const { t } = useTranslation();

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="w-[min(28rem,calc(100vw-2rem))]" data-testid="test-code-randomize-dialog">
        <DialogHeader>
          <DialogTitle>{t("testCode.randomizeTitle")}</DialogTitle>
          <DialogDescription>{t("testCode.randomizeDescription")}</DialogDescription>
        </DialogHeader>
        <DiscardWarning />
        <DialogFooter>
          <Button autoFocus onClick={() => onOpenChange(false)} variant="secondary">
            {t("testCode.cancel")}
          </Button>
          <Button data-testid="test-code-randomize-confirm" onClick={onConfirm}>
            {t("testCode.randomize")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EnterCodeDialog({
  hasProgress,
  onApplyCode,
  onClose,
}: {
  hasProgress: boolean;
  onApplyCode: (text: string) => ApplyTestCodeResult;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [problem, setProblem] = useState<Exclude<ApplyTestCodeResult, "applied"> | null>(null);

  function apply(event: React.FormEvent) {
    event.preventDefault();
    const result = onApplyCode(text);
    if (result === "applied") {
      onClose();
      return;
    }
    setProblem(result);
  }

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open>
      <DialogContent className="w-[min(28rem,calc(100vw-2rem))]" data-testid="test-code-enter-dialog">
        <form className="flex flex-col gap-4" onSubmit={apply}>
          <DialogHeader>
            <DialogTitle>{t("testCode.enterTitle")}</DialogTitle>
            <DialogDescription>{t("testCode.enterDescription")}</DialogDescription>
          </DialogHeader>
          <Field data-invalid={problem !== null}>
            <FieldLabel htmlFor="test-code-input">{t("testCode.codeLabel")}</FieldLabel>
            <Input
              aria-invalid={problem !== null}
              autoComplete="off"
              autoFocus
              id="test-code-input"
              onChange={(event) => {
                setText(event.target.value);
                setProblem(null);
              }}
              placeholder={t("testCode.codePlaceholder", { example: EXAMPLE_CODE })}
              spellCheck={false}
              value={text}
            />
            {problem && (
              <FieldError data-testid="test-code-problem">
                {problem === "invalid"
                  ? t("testCode.invalid", { example: EXAMPLE_CODE })
                  : t("testCode.otherVersion")}
              </FieldError>
            )}
          </Field>
          {hasProgress && <DiscardWarning />}
          <DialogFooter>
            <Button onClick={onClose} type="button" variant="secondary">
              {t("testCode.cancel")}
            </Button>
            <Button data-testid="test-code-apply" disabled={text.trim() === ""} type="submit">
              {t("testCode.apply")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
