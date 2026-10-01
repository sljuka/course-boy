import { useTranslation } from "react-i18next";

import { GeneratedLocaleNotice } from "@/components/generated-locale-notice";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Locale } from "@/lib/i18n";
import { getLocaleFlag } from "@/lib/locale-flags";
import {
  isGeneratedLocale,
  useGeneratedSerbianLocale,
} from "@/lib/use-serbian-script";

function getLocaleLabel(locale: Locale, t: (key: string) => string) {
  if (locale === "sr") {
    return t("language.serbian");
  }

  if (locale === "sr-Cyrl") {
    return t("language.serbianCyrillic");
  }

  return t("language.english");
}

// The language tab bar on its own, for a page whose tabs drive more than
// one area (the test editor: the title at the top, the exercises below). Must
// sit inside a `Tabs` root whose values are the locales.
export function LocaleTabsList({
  getIsIncomplete,
  locales,
}: {
  getIsIncomplete?: (locale: Locale) => boolean;
  locales: Locale[];
}) {
  const { t } = useTranslation();
  const generatedLocale = useGeneratedSerbianLocale();

  return (
    <TabsList aria-label="Course locales" className="flex-wrap">
      {locales.map((locale) => (
        <TabsTrigger key={locale} value={locale}>
          <span className="text-base leading-none">
            {getLocaleFlag(locale)}
          </span>
          <span>{getLocaleLabel(locale, t)}</span>
          {!isGeneratedLocale(generatedLocale, locale) &&
            getIsIncomplete?.(locale) && (
              <span
                aria-label="Locale content incomplete"
                className="size-2 rounded-full bg-destructive"
              />
            )}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}

type LocalesTabsProps = {
  activeLocale: Locale;
  className?: string;
  contentClassName?: string;
  getIsIncomplete?: (locale: Locale) => boolean;
  locales: Locale[];
  onActiveLocaleChange: (locale: Locale) => void;
  renderContent: (locale: Locale) => React.ReactNode;
};

export function LocalesTabs({
  activeLocale,
  className,
  contentClassName,
  getIsIncomplete,
  locales,
  onActiveLocaleChange,
  renderContent,
}: LocalesTabsProps) {
  // A generated Serbian script's tab shows a notice instead of its fields
  // (SLJ-17); its text is made from the source script on every save.
  const generatedLocale = useGeneratedSerbianLocale();

  if (locales.length === 1) {
    return (
      <div className={className}>
        <div className={contentClassName}>{renderContent(locales[0])}</div>
      </div>
    );
  }

  return (
    <Tabs
      className={className}
      onValueChange={(value) => onActiveLocaleChange(value as Locale)}
      value={activeLocale}
    >
      <LocaleTabsList getIsIncomplete={getIsIncomplete} locales={locales} />
      {locales.map((locale) => (
        <TabsContent
          // `contentClassName` is a second forwarded style prop (distinct from
          // `className`, which targets the root); the rule only recognizes a
          // literal `className` prop as forwardable.
          // eslint-disable-next-line shadcn/require-static-classes
          className={contentClassName}
          key={locale}
          value={locale}
        >
          {generatedLocale && isGeneratedLocale(generatedLocale, locale) ? (
            <GeneratedLocaleNotice
              onEditSource={() => onActiveLocaleChange(generatedLocale.source)}
              source={generatedLocale.source}
            />
          ) : (
            renderContent(locale)
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
