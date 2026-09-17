import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";
import { Info } from "lucide-react";

import { PageContent } from "@/components/page-content";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { LocalesTabs } from "@/components/locales-tabs";
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
import type { ContentRating, LocalizedCourseMetadata } from "@/lib/course-package";
import { useCreateCourseDraftMutation } from "@/lib/course-queries";
import { slugifyCourseName } from "@/lib/course-slug";
import { getContentRatingLabelKey } from "@/lib/course-utils";
import { locales, type Locale } from "@/lib/i18n";
import { getLocaleFlag } from "@/lib/locale-flags";
import { useAppState } from "@/lib/use-app-state";

const selectableLocales: Locale[] = ["en", "sr"];
const minimumCourseTitleLength = 8;

function getInitialSupportedLocales(locale: Locale): Locale[] {
  if (locale === "sr-Cyrl") {
    return ["sr"];
  }

  if (selectableLocales.includes(locale)) {
    return [locale];
  }

  return ["en"];
}

function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

function normalizeSupportedLocales(nextLocales: string[]): Locale[] {
  const localeSet = new Set<Locale>();

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

function resolveDefaultLocale(supportedLocales: Locale[]): Locale | null {
  if (supportedLocales.includes("en")) {
    return "en";
  }

  return supportedLocales[0] ?? null;
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

  return localizedCourse.title.trim().length > 0;
}

function isCourseTitleLongEnough(title: string | undefined): boolean {
  return (title?.trim().length ?? 0) >= minimumCourseTitleLength;
}

function isCourseTitlePresent(title: string | undefined): boolean {
  return (title?.trim().length ?? 0) > 0;
}

function CourseCreate() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locale, role } = useAppState();
  const createDraftMutation = useCreateCourseDraftMutation();
  const supportedLocalesAnchor = useComboboxAnchor();
  const [supportedLocales, setSupportedLocales] = useState<Locale[]>(() =>
    getInitialSupportedLocales(locale),
  );
  const [deriveSrCyrlFromSr, setDeriveSrCyrlFromSr] = useState(true);
  const [contentRating, setContentRating] = useState<ContentRating>("all-ages");
  const [activeLocale, setActiveLocale] = useState<Locale | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [localizedCourse, setLocalizedCourse] = useState<
    Record<Locale, LocalizedCourseMetadata>
  >({} as Record<Locale, LocalizedCourseMetadata>);

  useEffect(() => {
    setLocalizedCourse((currentLocalizedCourse) => {
      const nextLocalizedCourse = { ...currentLocalizedCourse };

      for (const locale of supportedLocales) {
        nextLocalizedCourse[locale] ??= createEmptyLocalizedCourse();
      }

      return nextLocalizedCourse;
    });
  }, [supportedLocales]);

  function updateLocalizedCourseField(
    locale: Locale,
    field: keyof LocalizedCourseMetadata,
    value: string,
  ) {
    setLocalizedCourse((currentLocalizedCourse) => ({
      ...currentLocalizedCourse,
      [locale]: {
        ...(currentLocalizedCourse[locale] ?? createEmptyLocalizedCourse()),
        [field]: value,
      },
    }));
  }

  useEffect(() => {
    if (activeLocale && supportedLocales.includes(activeLocale)) {
      return;
    }

    setActiveLocale(supportedLocales[0] ?? null);
  }, [activeLocale, supportedLocales]);

  useEffect(() => {
    if (!supportedLocales.includes("sr")) {
      setDeriveSrCyrlFromSr(true);
    }
  }, [supportedLocales]);

  const defaultLocale = resolveDefaultLocale(supportedLocales);
  const defaultLocaleTitle =
    (defaultLocale ? localizedCourse[defaultLocale]?.title : "") ?? "";
  const folderNamePreview =
    slugifyCourseName(defaultLocaleTitle.trim()) || "untitled-course";
  const shouldShowFolderPreview =
    defaultLocaleTitle.trim().length >= minimumCourseTitleLength;
  const getTitleValidationMessage = (locale: Locale): string | null => {
    const title = localizedCourse[locale]?.title;

    if (!isCourseTitlePresent(title)) {
      return t("courseCreate.validationRequiredBody", {
        locale: getLocaleCode(locale),
      });
    }

    if (!isCourseTitleLongEnough(title)) {
      return t("courseCreate.validationTooShortBody", {
        locale: getLocaleCode(locale),
        minimum: minimumCourseTitleLength,
      });
    }

    return null;
  };
  const titleValidationErrors = supportedLocales
    .map((locale) => getTitleValidationMessage(locale))
    .filter((message): message is string => Boolean(message));
  const hasValidationErrors =
    !defaultLocale ||
    supportedLocales.length === 0 ||
    titleValidationErrors.length > 0;

  if (role !== "teacher") {
    return <Navigate replace to="/" />;
  }

  return (
    <PageContent>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {t("courseCreate.title")}
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            {t("courseCreate.description")}
          </p>
        </div>
        <form
          className="flex min-w-0 max-w-3xl flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            setHasAttemptedSubmit(true);

            if (hasValidationErrors) {
              return;
            }

            createDraftMutation.mutate(
              {
                contentRating,
                defaultLocale: defaultLocale!,
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
                  navigate(`/drafts/${courseId}`, {
                    state: {
                      focusCourseTitle: true,
                    },
                  });
                },
              },
            );
          }}
        >
          <FieldSet className="gap-3">
            <FieldLegend variant="label">
              {t("courseCreate.fields.supportedLocales")}
            </FieldLegend>
            <FieldGroup className="gap-3">
              <Field>
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
                        <ComboboxChip key={locale} showRemove>
                          <span className="text-base leading-none">
                            {getLocaleFlag(locale)}
                          </span>
                          <span>{getLocaleLabel(locale, t)}</span>
                        </ComboboxChip>
                      ))}
                    </ComboboxValue>
                    <ComboboxChipsInput
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
              </Field>
              {supportedLocales.includes("sr") && (
                <Field orientation="horizontal">
                  <input
                    checked={deriveSrCyrlFromSr}
                    className="mt-0.5 h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                    id="course-create-derive-sr-cyrl"
                    onChange={(event) =>
                      setDeriveSrCyrlFromSr(event.target.checked)
                    }
                    type="checkbox"
                  />
                  <FieldContent>
                    <FieldLabel htmlFor="course-create-derive-sr-cyrl">
                      {t("courseCreate.fields.deriveSrCyrlFromSr")}
                    </FieldLabel>
                  </FieldContent>
                </Field>
              )}
            </FieldGroup>
          </FieldSet>
          {supportedLocales.length > 0 && activeLocale ? (
            <LocalesTabs
              activeLocale={activeLocale}
              getIsIncomplete={(locale) =>
                !isLocalizedCourseComplete(localizedCourse[locale])
              }
              locales={supportedLocales}
              onActiveLocaleChange={setActiveLocale}
              renderContent={(locale) => (
                <FieldSet>
                  <FieldLegend className="sr-only">
                    {getLocaleLabel(locale, t)}
                  </FieldLegend>
                  <FieldGroup className="gap-5">
                    <Field>
                      <FieldLabel htmlFor={`course-create-title-${locale}`}>
                        {t("courseCreate.fields.title")}
                        <span aria-hidden="true" className="text-destructive">
                          *
                        </span>
                      </FieldLabel>
                      <Input
                        id={`course-create-title-${locale}`}
                        onChange={(event) =>
                          updateLocalizedCourseField(
                            locale,
                            "title",
                            event.target.value,
                          )
                        }
                        placeholder={t("courseCreate.placeholders.title")}
                        value={localizedCourse[locale]?.title ?? ""}
                      />
                      {hasAttemptedSubmit && getTitleValidationMessage(locale) && (
                        <FieldDescription variant="destructive">
                          {getTitleValidationMessage(locale)}
                        </FieldDescription>
                      )}
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`course-create-description-${locale}`}>
                        {t("courseCreate.fields.description")}
                      </FieldLabel>
                      <Textarea
                        id={`course-create-description-${locale}`}
                        onChange={(event) =>
                          updateLocalizedCourseField(
                            locale,
                            "description",
                            event.target.value,
                          )
                        }
                        placeholder={t("courseCreate.placeholders.description")}
                        value={localizedCourse[locale]?.description ?? ""}
                      />
                    </Field>
                  </FieldGroup>
                </FieldSet>
              )}
            />
          ) : (
            <Card className="border border-dashed shadow-none">
              <CardContent>
                <CardDescription>
                  {t("courseCreate.selectLanguageFirst")}
                </CardDescription>
              </CardContent>
            </Card>
          )}
          <FieldSet>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="course-create-content-rating">
                  {t("contentRating.label")}
                </FieldLabel>
                <Select
                  onValueChange={(value) =>
                    setContentRating(value as ContentRating)
                  }
                  value={contentRating}
                >
                  <SelectTrigger
                    className="w-full max-w-sm"
                    id="course-create-content-rating"
                  >
                    <SelectValue>
                      {t(`contentRating.${getContentRatingLabelKey(contentRating)}`)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-ages">
                      {t("contentRating.allAges")}
                    </SelectItem>
                    <SelectItem value="mature-themes">
                      {t("contentRating.matureThemes")}
                    </SelectItem>
                    <SelectItem value="explicit">
                      {t("contentRating.explicit")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          </FieldSet>
          {shouldShowFolderPreview && (
            <Alert variant="info">
              <Info className="size-4" />
              <AlertTitle>{t("courseCreate.folderNamePreviewLabel")}</AlertTitle>
              <AlertDescription className="mt-1.5">
                {t("courseCreate.folderNameConvention", {
                  folderName: folderNamePreview,
                })}
              </AlertDescription>
            </Alert>
          )}
          {createDraftMutation.isError && (
            <Alert variant="destructive">
              <AlertTitle>{t("courseCreate.errorTitle")}</AlertTitle>
              <AlertDescription className="mt-1.5">
                {t("courseCreate.errorBody")}
              </AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end">
            <Button disabled={createDraftMutation.isPending} size="lg" type="submit">
              {createDraftMutation.isPending
                ? t("courseCreate.creating")
                : t("courseCreate.submit")}
            </Button>
          </div>
        </form>
      </div>
    </PageContent>
  );
}

export { CourseCreate };
