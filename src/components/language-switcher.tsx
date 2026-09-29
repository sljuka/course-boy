import { useTranslation } from 'react-i18next'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { locales, type Locale } from '@/lib/i18n'
import { getLocaleFlag } from '@/lib/locale-flags'
import { cn } from '@/lib/utils'

// Each language is named in its own script, so a Serbian reader recognises
// "Srpski" (Latin) and "Српски" (Cyrillic) whichever one the app is in.
const localeLabelKeys: Record<Locale, string> = {
  en: 'language.english',
  sr: 'language.serbian',
  'sr-Cyrl': 'language.serbianCyrillic',
}

type LanguageSwitcherProps = {
  className?: string
  locale: Locale
  onLocaleChange: (locale: Locale) => void
}

function LanguageSwitcher({ className, locale, onLocaleChange }: LanguageSwitcherProps) {
  const { t } = useTranslation()

  return (
    <Select onValueChange={(value) => onLocaleChange(value as Locale)} value={locale}>
      <SelectTrigger aria-label={t('language.label')} className={cn('h-8 w-36', className)}>
        <SelectValue>
          <span className="text-base leading-none">{getLocaleFlag(locale)}</span>
          <span className="truncate">{t(localeLabelKeys[locale])}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {locales.map((option) => (
          <SelectItem key={option} value={option}>
            <span className="text-base leading-none">{getLocaleFlag(option)}</span>
            {t(localeLabelKeys[option])}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export { LanguageSwitcher }
