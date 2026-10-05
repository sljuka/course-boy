import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { MnemonicTerm } from "@/components/ui/mnemonic-term";

// A term with its mnemonic, as students see it (lessons and test prompts).
export function MnemonicInline({ children, mnemonic }: { children: ReactNode; mnemonic: string }) {
  const { t } = useTranslation();

  return (
    <MnemonicTerm label={t("mnemonics.srLabel", { mnemonic })} mnemonic={mnemonic}>
      {children}
    </MnemonicTerm>
  );
}
