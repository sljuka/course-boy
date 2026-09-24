import { createContext, useContext } from "react";

import type { Locale } from "@/lib/i18n";

// BlockNote's custom blocks have no way to receive extra props from their
// parent `BlockNoteView` beyond the block's own data — this is how the
// exercise block (`exercise-block.tsx`) gets at the values it needs
// (uploads, locale-scoped fields) that every other document editor consumer
// already gets as plain props.
type DocumentEditorContextValue = {
  courseId: string;
  supportedLocales: Locale[];
};

const DocumentEditorContext = createContext<DocumentEditorContextValue | null>(null);

export function DocumentEditorContextProvider({
  children,
  ...value
}: DocumentEditorContextValue & { children: React.ReactNode }) {
  return (
    <DocumentEditorContext.Provider value={value}>{children}</DocumentEditorContext.Provider>
  );
}

export function useDocumentEditorContext(): DocumentEditorContextValue {
  const context = useContext(DocumentEditorContext);

  if (!context) {
    throw new Error(
      "useDocumentEditorContext must be used within a DocumentEditorContextProvider",
    );
  }

  return context;
}
