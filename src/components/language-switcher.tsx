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
  const isSerbian = locale === 'sr' || locale === 'sr-Cyrl'
  const selectValue = isSerbian ? 'sr' : 'en'

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <label className="sr-only" htmlFor="language">
          {t('language.english')}
        </label>
        <Select
          onValueChange={(value) => onLocaleChange(value as 'en' | 'sr')}
          value={selectValue}
        >
          <SelectTrigger aria-label="Language" className="w-[9.5rem] pl-10">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm">
              {selectValue === 'en' ? '🇬🇧' : '🇷🇸'}
            </span>
            <SelectValue>
              {selectValue === 'sr' ? t('language.serbian') : t('language.english')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">🇬🇧 {t('language.english')}</SelectItem>
            <SelectItem value="sr">🇷🇸 {t('language.serbian')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isSerbian ? (
        <div className="inline-flex overflow-hidden rounded-full border border-amber-200 bg-amber-50/80">
          <button
            className={`px-3 py-2 text-xs font-semibold transition-colors ${
              locale === 'sr'
                ? 'bg-amber-900 text-amber-50'
                : 'text-amber-900 hover:bg-amber-100'
            }`}
            onClick={() => onLocaleChange('sr')}
            type="button"
          >
            C
          </button>
          <button
            className={`px-3 py-2 text-xs font-semibold transition-colors ${
              locale === 'sr-Cyrl'
                ? 'bg-amber-900 text-amber-50'
                : 'text-amber-900 hover:bg-amber-100'
            }`}
            onClick={() => onLocaleChange('sr-Cyrl')}
            type="button"
          >
            Ц
          </button>
        </div>
      ) : null}
    </div>
  )
}

export { LanguageSwitcher }
