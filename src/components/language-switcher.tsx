import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Locale } from '@/lib/i18n'
import { useTranslation } from 'react-i18next'

type LanguageSwitcherProps = {
  locale: Locale
  onLocaleChange: (locale: Locale) => void
}

function LanguageSwitcher({
  locale,
  onLocaleChange,
}: LanguageSwitcherProps) {
  const { t } = useTranslation()

  return (
    <div className="relative">
      <label className="sr-only" htmlFor="language">
        {t('language.english')}
      </label>
      <Select onValueChange={(value) => onLocaleChange(value as Locale)} value={locale}>
        <SelectTrigger aria-label="Language" className="w-[8.5rem] pl-10">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm">
            {locale === 'sr' ? '🇷🇸' : '🇬🇧'}
          </span>
          <SelectValue>
            {locale === 'sr' ? t('language.serbian') : t('language.english')}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">🇬🇧 {t('language.english')}</SelectItem>
          <SelectItem value="sr">🇷🇸 {t('language.serbian')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

export { LanguageSwitcher }
