import { FormEvent } from 'react'
import { Info } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { LanguageSwitcher } from '@/components/language-switcher'
import { Button } from '@/components/ui/button'
import { CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
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
    navigate('/onboarding/persona')
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-4 pr-2">
          <CardTitle className="text-3xl text-primary sm:text-4xl">
            {t('welcomeTitle')}
          </CardTitle>
          <p className="max-w-lg text-sm leading-6 text-muted-foreground">
            {t('welcomeSubtitle')}
          </p>
        </div>
        <div className="self-end sm:self-auto">
          <LanguageSwitcher locale={locale} onLocaleChange={setLocale} />
        </div>
      </div>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="name">{t('nameLabel')}</FieldLabel>
          <Input
            autoComplete="nickname"
            className="sm:flex-1"
            id="name"
            onChange={(event) => setNickname(event.target.value)}
            placeholder={t('namePlaceholder')}
            value={nickname}
          />
        </Field>
        <Alert variant="info">
          <Info aria-hidden="true" className="h-4 w-4 text-info" />
          <AlertDescription>{t('nameHint')}</AlertDescription>
        </Alert>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Button className="sm:w-auto sm:px-6" disabled={!nickname.trim()} type="submit">
            {t('continue')}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
