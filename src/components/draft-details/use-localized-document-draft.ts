import { useCallback, useEffect, useState } from "react";

import {
  buildDocumentSeed,
  type DocumentLocaleDraft,
} from "@/components/draft-details/draft-document-seed";
import {
  createInitialDocumentBlocks,
  type EditorPrototypeBlock,
} from "@/components/editor-prototype/editor-prototype-types";
import type { Locale } from "@/lib/i18n";

// Every language's blocks of a document edited per language (a lesson body or
// a section intro), seeded from the saved bodies so an untouched language is
// never rewritten. Shown by `LocalizedDocumentEditor`; saved by the caller.
export function useLocalizedDocumentDraft({
  appLocale,
  bodies,
  supportedLocales,
}: {
  appLocale: Locale;
  // Each language's saved body (markdown); missing or blank → the template.
  bodies: Partial<Record<Locale, string>>;
  supportedLocales: Locale[];
}) {
  const [initialLocale] = useState<Locale>(() =>
    supportedLocales.includes(appLocale) ? appLocale : (supportedLocales[0] ?? appLocale),
  );
  // Frozen at mount: the editor's starting content per language, and the
  // autosave baseline — so an untouched language tab is never written.
  const [seed] = useState<DocumentLocaleDraft>(() => buildDocumentSeed(bodies, supportedLocales));
  const [draft, setDraft] = useState<DocumentLocaleDraft>(seed);
  // Frozen at mount, same as `seed` above — a document that starts blank gets
  // its heading autofocused; one that already has real content never does.
  const [isNewDocument] = useState(() => (bodies[initialLocale] ?? "").trim().length === 0);
  const [activeLocale, setActiveLocale] = useState<Locale>(initialLocale);

  useEffect(() => {
    if (supportedLocales.includes(activeLocale)) {
      return;
    }

    setActiveLocale(supportedLocales[0] ?? appLocale);
  }, [activeLocale, appLocale, supportedLocales]);

  const activeBlocks = draft[activeLocale] ?? createInitialDocumentBlocks(undefined, activeLocale);
  const setActiveBlocks = useCallback(
    (blocks: EditorPrototypeBlock[]) => setDraft((current) => ({ ...current, [activeLocale]: blocks })),
    [activeLocale],
  );

  return { activeBlocks, activeLocale, draft, isNewDocument, seed, setActiveBlocks, setActiveLocale };
}

export type LocalizedDocumentDraft = ReturnType<typeof useLocalizedDocumentDraft>;
