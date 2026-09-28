import {
  createInitialDocumentBlocks,
  type EditorPrototypeBlock,
} from "@/components/editor-prototype/editor-prototype-types";
import type { Locale } from "@/lib/i18n";
import { markdownToBlocks } from "@/lib/lesson-content-markdown";

export type DocumentLocaleDraft = Partial<Record<Locale, EditorPrototypeBlock[]>>;

// The document editor's starting content for *every* language the course
// supports, each seeded from that language's own saved lesson body. A language
// with no saved content yet starts from the blank template.
//
// Seeding only the app's current language (and giving other language tabs a
// fresh template) used to lose data: the first keystroke in such a tab
// autosaved the template over that language's real file. Because every tab is
// seeded here and the same object is the autosave baseline, an untouched tab
// equals its saved value and is never written.
export function buildDocumentSeed(
  lessonBodies: Partial<Record<Locale, string>>,
  locales: readonly Locale[],
): DocumentLocaleDraft {
  return Object.fromEntries(
    locales.map((locale) => {
      const body = lessonBodies[locale] ?? "";

      return [
        locale,
        body.trim().length > 0 ? markdownToBlocks(body) : createInitialDocumentBlocks(undefined, locale),
      ];
    }),
  );
}
