import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";

import { PageContent } from "@/components/page-content";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useComboboxAnchor } from "@/components/ui/use-combobox-anchor";
import type { LocalizedCourseMetadata } from "@/lib/course-package";
import { useCreateCourseDraftMutation } from "@/lib/course-queries";
import { locales, type Locale } from "@/lib/i18n";
import { getLocaleFlag } from "@/lib/locale-flags";
import { useAppState } from "@/lib/use-app-state";

const defaultLocale: Locale = "en";
const selectableLocales: Locale[] = ["en", "sr"];

function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

function normalizeSupportedLocales(nextLocales: string[]): Locale[] {
  const localeSet = new Set<Locale>([defaultLocale]);

  for (const locale of nextLocales) {
    if (isLocale(locale)) {
      localeSet.add(locale);
    }
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

function getLocaleCode(locale: Locale): string {
  if (locale === "sr-Cyrl") {
    return "sr-Cyrl";
  }

  return locale;
}

function getEffectiveSupportedLocales(
  supportedLocales: Locale[],
  deriveSrCyrlFromSr: boolean,
): Locale[] {
  if (deriveSrCyrlFromSr && supportedLocales.includes("sr")) {
    return [...supportedLocales, "sr-Cyrl"];
  }

  return supportedLocales;
}

function createEmptyLocalizedCourse(): LocalizedCourseMetadata {
  return {
    description: "",
    title: "",
  };
}

function isLocalizedCourseComplete(
  localizedCourse: LocalizedCourseMetadata | undefined,
): boolean {
  if (!localizedCourse) {
    return false;
  }

  return (
    localizedCourse.title.trim().length > 0 &&
    localizedCourse.description.trim().length > 0
  );
}

function CourseCreate() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { role } = useAppState();
  const createDraftMutation = useCreateCourseDraftMutation();
  const supportedLocalesAnchor = useComboboxAnchor();
  const [supportedLocales, setSupportedLocales] = useState<Locale[]>(["en"]);
  const [deriveSrCyrlFromSr, setDeriveSrCyrlFromSr] = useState(true);
  const [activeLocale, setActiveLocale] = useState<Locale>("en");
  const [localizedCourse, setLocalizedCourse] = useState<
    Record<Locale, LocalizedCourseMetadata>
  >({
    en: createEmptyLocalizedCourse(),
  } as Record<Locale, LocalizedCourseMetadata>);

  useEffect(() => {
    setLocalizedCourse((currentLocalizedCourse) => {
      const nextLocalizedCourse = { ...currentLocalizedCourse };

      for (const locale of supportedLocales) {
        nextLocalizedCourse[locale] ??= createEmptyLocalizedCourse();
      }

      return nextLocalizedCourse;
    });
  }, [supportedLocales]);

  useEffect(() => {
    if (!supportedLocales.includes(activeLocale)) {
      setActiveLocale(defaultLocale);
    }
  }, [activeLocale, supportedLocales]);

  useEffect(() => {
    if (!supportedLocales.includes("sr")) {
      setDeriveSrCyrlFromSr(true);
    }
  }, [supportedLocales]);

  const defaultCourseLocale =
    localizedCourse[defaultLocale] ?? createEmptyLocalizedCourse();
  const normalizedTitle = defaultCourseLocale.title.trim();
  const normalizedDescription = defaultCourseLocale.description.trim();
  const effectiveSupportedLocales = getEffectiveSupportedLocales(
    supportedLocales,
    deriveSrCyrlFromSr,
  );
  const canSubmit =
    supportedLocales.every((locale) =>
      isLocalizedCourseComplete(localizedCourse[locale]),
    ) && !createDraftMutation.isPending;

  if (role !== "teacher") {
    return <Navigate replace to="/" />;
  }

  return (
    <PageContent>
      <Card className="overflow-hidden">
        <CardHeader
          subtitle={
            <CardDescription className="max-w-2xl text-base text-stone-600">
              {t("courseCreate.description")}
            </CardDescription>
          }
          title={<CardTitle>{t("courseCreate.title")}</CardTitle>}
        />
        <CardContent>
          <div className="flex gap-4">
            <form
              className="flex flex-1 flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();

                if (!canSubmit) {
                  return;
                }

                createDraftMutation.mutate(
                  {
                    defaultLocale,
                    deriveSrCyrlFromSr,
                    locales: Object.fromEntries(
                      supportedLocales.map((locale) => [
                        locale,
                        {
                          title: localizedCourse[locale]?.title.trim() ?? "",
                          description:
                            localizedCourse[locale]?.description.trim() ?? "",
                        },
                      ]),
                    ) as Record<Locale, LocalizedCourseMetadata>,
                    supportedLocales,
                  },
                {
                  onSuccess: ({ courseId }) => {
                    navigate(`/drafts/${courseId}`);
                  },
                },
              );
              }}
            >
              <div>
                <div>
                  <Label htmlFor="course-create-supported-locales">
                    {t("courseCreate.fields.supportedLocales")}
                  </Label>
                  <Combobox
                    items={selectableLocales}
                    multiple
                    onValueChange={(nextLocales) =>
                      setSupportedLocales(
                        normalizeSupportedLocales(nextLocales as string[]),
                      )
                    }
                    value={supportedLocales}
                  >
                    <ComboboxChips
                      id="course-create-supported-locales"
                      ref={supportedLocalesAnchor}
                    >
                      <ComboboxValue>
                        {supportedLocales.map((locale) => (
                          <ComboboxChip
                            key={locale}
                            showRemove={locale !== defaultLocale}
                          >
                            <span className="text-base leading-none">
                              {getLocaleFlag(locale)}
                            </span>
                            <span>{getLocaleLabel(locale, t)}</span>
                          </ComboboxChip>
                        ))}
                      </ComboboxValue>
                      <ComboboxChipsInput
                        className="min-h-8"
                        placeholder={t(
                          "courseCreate.placeholders.supportedLocales",
                        )}
                      />
                    </ComboboxChips>
                    <ComboboxContent anchor={supportedLocalesAnchor}>
                      <ComboboxEmpty>
                        {t("courseCreate.emptySupportedLocales")}
                      </ComboboxEmpty>
                      <ComboboxList>
                        {(locale) => (
                          <ComboboxItem key={locale} value={locale}>
                            <span className="text-lg leading-none">
                              {getLocaleFlag(locale)}
                            </span>
                            <span>{getLocaleLabel(locale, t)}</span>
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>
                {supportedLocales.includes("sr") && (
                  <Label className="flex items-center gap-3 px-1 py-1">
                    <input
                      checked={deriveSrCyrlFromSr}
                      className="mt-0.5 h-4 w-4 rounded border-stone-300 text-blue-600 focus:ring-amber-500"
                      onChange={(event) =>
                        setDeriveSrCyrlFromSr(event.target.checked)
                      }
                      type="checkbox"
                    />
                    <span className="text-sm leading-6 text-stone-700">
                      {t("courseCreate.fields.deriveSrCyrlFromSr")}
                    </span>
                  </Label>
                )}
              </div>
              <Tabs
                onValueChange={(value) => {
                  if (isLocale(value)) {
                    setActiveLocale(value);
                  }
                }}
                value={activeLocale}
              >
                <TabsList variant="line">
                  {supportedLocales.map((locale) => (
                    <TabsTrigger key={locale} value={locale}>
                      <span className="text-base leading-none">
                        {getLocaleFlag(locale)}
                      </span>
                      <span>{getLocaleCode(locale)}</span>
                      {!isLocalizedCourseComplete(localizedCourse[locale]) && (
                        <span
                          aria-hidden="true"
                          className="mt-0.5 h-1.5 w-1.5 shrink-0 self-center rounded-full bg-rose-500"
                        />
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {supportedLocales.map((locale) => (
                  <TabsContent
                    className="rounded-3xl border border-stone-200 bg-white p-6 shadow-[0_16px_30px_-24px_rgba(28,25,23,0.18)]"
                    key={locale}
                    value={locale}
                  >
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor={`course-create-title-${locale}`}>
                          {t("courseCreate.fields.title")}
                        </Label>
                        <Input
                          id={`course-create-title-${locale}`}
                          onChange={(event) =>
                            setLocalizedCourse((currentLocalizedCourse) => ({
                              ...currentLocalizedCourse,
                              [locale]: {
                                ...currentLocalizedCourse[locale],
                                description:
                                  currentLocalizedCourse[locale]?.description ??
                                  "",
                                title: event.target.value,
                              },
                            }))
                          }
                          placeholder={t("courseCreate.placeholders.title")}
                          value={localizedCourse[locale]?.title ?? ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`course-create-description-${locale}`}>
                          {t("courseCreate.fields.description")}
                        </Label>
                        <Textarea
                          id={`course-create-description-${locale}`}
                          onChange={(event) =>
                            setLocalizedCourse((currentLocalizedCourse) => ({
                              ...currentLocalizedCourse,
                              [locale]: {
                                ...currentLocalizedCourse[locale],
                                description: event.target.value,
                                title:
                                  currentLocalizedCourse[locale]?.title ?? "",
                              },
                            }))
                          }
                          placeholder={t(
                            "courseCreate.placeholders.description",
                          )}
                          value={localizedCourse[locale]?.description ?? ""}
                        />
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
              {createDraftMutation.isError && (
                <Alert className="border-rose-200 bg-rose-50/90 text-rose-950 shadow-[0_12px_28px_-24px_rgba(244,63,94,0.35)]">
                  <AlertTitle className="text-rose-950">
                    {t("courseCreate.errorTitle")}
                  </AlertTitle>
                  <AlertDescription className="mt-1.5 text-rose-900/90">
                    {t("courseCreate.errorBody")}
                  </AlertDescription>
                </Alert>
              )}
              <div className="flex justify-end">
                <Button disabled={!canSubmit} size="lg" type="submit">
                  {createDraftMutation.isPending
                    ? t("courseCreate.creating")
                    : t("courseCreate.submit")}
                </Button>
              </div>
            </form>
            <div className="rounded-3xl  border border-stone-200 bg-stone-50 p-5">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  {t("courseCreate.previewLabel")}
                </p>
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold text-stone-950">
                    {normalizedTitle || t("courseCreate.previewUntitled")}
                  </h2>
                  <p className="text-sm leading-6 text-stone-600">
                    {normalizedDescription ||
                      t("courseCreate.previewDescription")}
                  </p>
                </div>
                <dl className="space-y-3 pt-2 text-sm text-stone-700">
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-stone-500">
                      {t("courseCreate.fields.defaultLocale")}
                    </dt>
                    <dd className="font-medium text-stone-950">
                      {t("language.english")}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-stone-500">
                      {t("courseCreate.fields.supportedLocales")}
                    </dt>
                    <dd className="text-right font-medium text-stone-950">
                      {effectiveSupportedLocales
                        .map((locale) => getLocaleLabel(locale, t))
                        .join(", ")}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageContent>
  );
}

export { CourseCreate };
