import { ArrowLeft } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { LanguageSwitcher } from '@/components/language-switcher'
import { Button } from '@/components/ui/button'
import { useAppState } from '@/lib/use-app-state'
import type { UserRole } from '@/lib/preferences'

const roleOptions: UserRole[] = ['student', 'teacher']

export const RolePage = () => {
  const navigate = useNavigate()
  const { locale, persona, role, setLocale, setRole, submittedName } = useAppState()
  const { t } = useTranslation()

  if (!submittedName) {
    return <Navigate replace to="/onboarding" />
  }

  if (!persona) {
    return <Navigate replace to="/onboarding/persona" />
  }

  function handleSelect(nextRole: UserRole) {
    setRole(nextRole)
    navigate('/')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2 pr-2">
          <Button
            className="-ml-2 h-auto gap-1 px-2 py-1 text-muted-foreground"
            onClick={() => navigate('/onboarding/persona')}
            type="button"
            variant="ghost"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            {t('back')}
          </Button>
          <h2 className="text-xl font-semibold text-foreground">
            {t('roleTitle', { name: submittedName })}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {t('roleSubtitle')}
          </p>
        </div>
        <div className="self-end sm:self-auto">
          <LanguageSwitcher locale={locale} onLocaleChange={setLocale} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {roleOptions.map((roleOption) => (
          <Button
            className="justify-start rounded-2xl px-5 py-6 text-left"
            key={roleOption}
            onClick={() => handleSelect(roleOption)}
            type="button"
            variant={role === roleOption ? 'default' : 'secondary'}
          >
            {t(`roles.${roleOption}`)}
          </Button>
        ))}
      </div>
    </div>
  )
}
