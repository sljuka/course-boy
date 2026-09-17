import { useTranslation } from "react-i18next";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Locale } from "@/lib/i18n";
import { getLocaleFlag } from "@/lib/locale-flags";

function getLocaleLabel(locale: Locale, t: (key: string) => string) {
  if (locale === "sr") {
    return t("language.serbian");
  }

  if (locale === "sr-Cyrl") {
    return t("language.serbianCyrillic");
  }

  return t("language.english");
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
  const { t } = useTranslation();

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
      <TabsList aria-label="Course locales" className="flex-wrap">
        {locales.map((locale) => (
          <TabsTrigger key={locale} value={locale}>
            <span className="text-base leading-none">{getLocaleFlag(locale)}</span>
            <span>{getLocaleLabel(locale, t)}</span>
            {getIsIncomplete?.(locale) && (
              <span
                aria-label="Locale content incomplete"
                className="size-2 rounded-full bg-red-500"
              />
            )}
          </TabsTrigger>
        ))}
      </TabsList>
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
          {renderContent(locale)}
        </TabsContent>
      ))}
    </Tabs>
  );
}
