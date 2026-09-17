import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Locale } from '@/lib/i18n'
import { getLocaleFlag } from '@/lib/locale-flags'
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
  const scriptLabel = locale === 'sr-Cyrl' ? 'C' : 'Ц'

  function handleScriptToggle() {
    onLocaleChange(locale === 'sr-Cyrl' ? 'sr' : 'sr-Cyrl')
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <label className="sr-only" htmlFor="language">
          {t('language.english')}
        </label>
        <Select
          onValueChange={(value) => onLocaleChange(value as 'en' | 'sr')}
          value={selectValue}
        >
          <SelectTrigger aria-label="Language" className="h-10 w-[8.75rem] pl-9">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg leading-none">
              {getLocaleFlag(selectValue)}
            </span>
            <SelectValue>
              {selectValue === 'sr' ? t('language.serbian') : t('language.english')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">
              <span className="text-lg leading-none">{getLocaleFlag('en')}</span> {t('language.english')}
            </SelectItem>
            <SelectItem value="sr">
              <span className="text-lg leading-none">{getLocaleFlag('sr')}</span> {t('language.serbian')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isSerbian && (
        <Button
          aria-label={
            locale === 'sr-Cyrl'
              ? t('language.switchToLatin')
              : t('language.switchToCyrillic')
          }
          className="text-xs font-semibold"
          onClick={handleScriptToggle}
          shape="circle"
          size="icon"
          type="button"
          variant="outline"
        >
          {scriptLabel}
        </Button>
      )}
    </div>
  )
}

export { LanguageSwitcher }
