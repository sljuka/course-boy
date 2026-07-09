import { ArrowLeft, Construction } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardTitle } from '@/components/ui/card'

type InDevelopmentProps = {
  fallbackPath?: string
}

export const InDevelopment = ({ fallbackPath = '/' }: InDevelopmentProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate(fallbackPath)
  }

  return (
    <Card className="mx-auto w-full max-w-3xl overflow-hidden">
      <CardContent className="flex flex-col items-center gap-6 px-8 py-14 text-center sm:px-12 sm:py-18">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-amber-100 text-amber-700 sm:h-28 sm:w-28">
          <Construction aria-hidden="true" className="h-12 w-12 sm:h-14 sm:w-14" />
        </div>
        <div className="space-y-3">
          <CardTitle className="text-3xl text-amber-950 sm:text-4xl">
            {t('inDevelopment.title')}
          </CardTitle>
          <p className="mx-auto max-w-xl text-sm leading-6 text-stone-500 sm:text-base">
            {t('inDevelopment.description')}
          </p>
        </div>
        <Button className="w-auto gap-2 px-6" onClick={handleBack} variant="secondary">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          {t('back')}
        </Button>
      </CardContent>
    </Card>
  )
}
