import { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { LanguageSwitcher } from '@/components/language-switcher'
import { Button } from '@/components/ui/button'
import { CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAppState } from '@/lib/use-app-state'
import { useTranslation } from 'react-i18next'

export const WelcomePage = () => {
  const navigate = useNavigate()
  const { locale, nickname, setLocale, setNickname, submitNickname } = useAppState()
  const { t } = useTranslation()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedName = nickname.trim()
    if (!normalizedName) {
      return
    }

    submitNickname(normalizedName)
    navigate('/onboarding/role')
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-4 pr-2">
          <CardTitle className="text-3xl text-amber-950 sm:text-4xl">
            {t('welcomeTitle')}
          </CardTitle>
          <p className="max-w-lg text-sm leading-6 text-stone-500">
            {t('welcomeSubtitle')}
          </p>
        </div>
        <div className="self-end sm:self-auto">
          <LanguageSwitcher locale={locale} onLocaleChange={setLocale} />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <Label htmlFor="name">{t('nameLabel')}</Label>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Input
            autoComplete="nickname"
            className="sm:flex-1"
            id="name"
            onChange={(event) => setNickname(event.target.value)}
            placeholder={t('namePlaceholder')}
            value={nickname}
          />
          <Button className="sm:w-auto sm:px-6" disabled={!nickname.trim()} type="submit">
            {t('continue')}
          </Button>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm leading-6 text-amber-950">
          <p>{t('nameHint')}</p>
        </div>
      </div>
    </form>
  )
}
