import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { LanguageSwitcher } from '@/components/language-switcher'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { PERSONAS } from '@/lib/personas'
import { useAppState } from '@/lib/use-app-state'
import type { Persona } from '@/lib/preferences'

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items]

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled
}

export const PersonaPage = () => {
  const navigate = useNavigate()
  const { locale, persona, setLocale, setPersona, submittedName } = useAppState()
  const { t } = useTranslation()
  // Randomized once per visit, not on every re-render, so picking a radio
  // doesn't reshuffle the options out from under the user.
  const [personaOptions] = useState(() => shuffle(PERSONAS))
  const [selected, setSelected] = useState<Persona | null>(persona ?? personaOptions[0].id)

  if (!submittedName) {
    return <Navigate replace to="/onboarding" />
  }

  const selectedOption = personaOptions.find((option) => option.id === selected)

  function handleContinue() {
    if (!selected) {
      return
    }

    setPersona(selected)
    navigate('/onboarding/role')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2 pr-2">
          <Button
            className="-ml-2 h-auto gap-1 px-2 py-1 text-muted-foreground"
            onClick={() => navigate('/onboarding')}
            type="button"
            variant="ghost"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            {t('back')}
          </Button>
          <h2 className="text-xl font-semibold text-foreground">{t('personaTitle')}</h2>
        </div>
        <div className="self-end sm:self-auto">
          <LanguageSwitcher locale={locale} onLocaleChange={setLocale} />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <RadioGroup
          onValueChange={(value) => setSelected(value as Persona)}
          value={selected ?? ''}
        >
          {personaOptions.map((option) => (
            <Label key={option.id}>
              <RadioGroupItem aria-label={t(option.labelKey)} value={option.id} />
              {t(option.labelKey)}
            </Label>
          ))}
        </RadioGroup>
        <div className="flex flex-1 items-center justify-center self-stretch">
          {selectedOption && (
            <img alt="" className="h-44 w-44 rounded-full" src={selectedOption.imageUrl} />
          )}
        </div>
      </div>
      <Button disabled={!selected} onClick={handleContinue} type="button">
        {t('continue')}
      </Button>
    </div>
  )
}
