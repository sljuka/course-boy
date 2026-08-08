import { useEffect, useRef } from "react";
import { Navigate, useOutletContext, useParams } from "react-router-dom";

import { EditorPrototype } from "@/components/editor-prototype/editor-prototype";
import { Badge } from "@/components/ui/badge";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useComboboxAnchor } from "@/components/ui/use-combobox-anchor";
import { courseRootId } from "@/components/course-structure-prototype/course-structure-prototype-types";
import type {
  ContentRating,
  CourseLayoutOutletContext,
} from "@/components/course-layout";
import { locales, type Locale } from "@/lib/i18n";
import { getLocaleFlag } from "@/lib/locale-flags";
import { useTranslation } from "react-i18next";

function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

function normalizeSupportedLocales(nextLocales: string[], fallback: Locale): Locale[] {
  const localeSet = new Set<Locale>();

  for (const locale of nextLocales) {
    if (isLocale(locale)) {
      localeSet.add(locale);
    }
  }

  if (localeSet.size === 0) {
    localeSet.add(fallback);
  }

  return locales.filter((locale) => localeSet.has(locale));
}

function getLocaleLabel(locale: Locale, t: (key: string) => string) {
  if (locale === "sr") {
    return t("language.serbian");
  }

  if (locale === "sr-Cyrl") {
    return t("language.serbianCyrillic");
  }

  return t("language.english");
}

function getContentRatingLabel(contentRating: ContentRating) {
  switch (contentRating) {
    case "all-ages":
      return "All ages";
    case "mature-themes":
      return "Contains mature themes";
    case "explicit":
      return "Explicit";
  }
}

export function DraftDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { t, i18n } = useTranslation();
  const supportedLocalesAnchor = useComboboxAnchor();
  const courseTitleRef = useRef<HTMLInputElement | null>(null);
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const {
    contentRating,
    courseDescription,
    courseTitle,
    selectedNode,
    setContentRating,
    setCourseDescription,
    setCourseTitle,
    setSupportedLocales,
    supportedLocales,
  } = useOutletContext<CourseLayoutOutletContext>();

  useEffect(() => {
    if (selectedNode.id !== courseRootId) {
      return;
    }

    courseTitleRef.current?.focus();
    courseTitleRef.current?.select();
  }, [selectedNode.id]);

  useEffect(() => {
    const textarea = descriptionRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [courseDescription]);

  if (!courseId) {
    return <Navigate replace to="/drafts" />;
  }

  if (selectedNode.id === courseRootId) {
    return (
      <div className="h-full p-4 sm:p-5 lg:p-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Input
                autoFocus
                className="h-auto border-0 bg-transparent p-0 text-3xl font-semibold tracking-tight text-stone-950 shadow-none placeholder:text-stone-300 focus-visible:ring-0 md:text-3xl"
                onChange={(event) => setCourseTitle(event.target.value)}
                placeholder="Course"
                ref={courseTitleRef}
                value={courseTitle}
              />
              <Textarea
                className="min-h-0 resize-none overflow-hidden border-0 bg-transparent px-0 py-0 text-base font-medium text-stone-600 shadow-none placeholder:text-stone-400 focus-visible:ring-0 md:text-base"
                onChange={(event) => setCourseDescription(event.target.value)}
                placeholder="Add a short course description"
                ref={descriptionRef}
                rows={1}
                value={courseDescription}
              />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Supported locales
                </p>
                <Badge variant="secondary">{supportedLocales.length}</Badge>
              </div>
              <Combobox
                items={locales}
                multiple
                onValueChange={(nextLocales) =>
                  setSupportedLocales(
                    normalizeSupportedLocales(
                      nextLocales as string[],
                      i18n.language as Locale,
                    ),
                  )
                }
                value={supportedLocales}
              >
                <ComboboxChips ref={supportedLocalesAnchor}>
                  <ComboboxValue>
                    {supportedLocales.map((locale) => (
                      <ComboboxChip key={locale} showRemove>
                        <span className="text-base leading-none">
                          {getLocaleFlag(locale)}
                        </span>
                        <span>{getLocaleLabel(locale, t)}</span>
                      </ComboboxChip>
                    ))}
                  </ComboboxValue>
                  <ComboboxChipsInput
                    className="min-h-8"
                    placeholder="Add supported locales"
                  />
                </ComboboxChips>
                <ComboboxContent anchor={supportedLocalesAnchor}>
                  <ComboboxEmpty>No locales found.</ComboboxEmpty>
                  <ComboboxList>
                    {locales.map((locale) => (
                      <ComboboxItem key={locale} value={locale}>
                        <span className="text-base leading-none">
                          {getLocaleFlag(locale)}
                        </span>
                        <span>{getLocaleLabel(locale, t)}</span>
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>

              <div className="flex flex-col gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Content rating
                </p>
                <Select
                  onValueChange={(value) => setContentRating(value as ContentRating)}
                  value={contentRating}
                >
                  <SelectTrigger className="w-full max-w-sm">
                    <SelectValue>
                      {getContentRatingLabel(contentRating)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-ages">All ages</SelectItem>
                    <SelectItem value="mature-themes">
                      Contains mature themes
                    </SelectItem>
                    <SelectItem value="explicit">Explicit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-4 sm:p-5 lg:p-6">
      <div className="flex flex-col gap-3 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
          {selectedNode.type}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-950">
          {selectedNode.title}
        </h1>
      </div>
      <EditorPrototype />
    </div>
  );
}
