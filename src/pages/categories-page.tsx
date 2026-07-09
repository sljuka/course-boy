import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { categories } from '@/lib/categories'
import { useAppState } from '@/lib/use-app-state'

export const CategoriesPage = () => {
  const { category, setCategory } = useAppState()
  const { t } = useTranslation()

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-stone-900">
          {t('categoryTitle')}
        </h2>
        <p className="text-sm leading-6 text-stone-500">
          {t('categorySubtitle')}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {categories.map((categoryOption) => (
          <Button
            className="justify-start rounded-2xl px-5 text-left"
            key={categoryOption}
            onClick={() => setCategory(categoryOption)}
            type="button"
            variant={category === categoryOption ? 'default' : 'secondary'}
          >
            {t(
              `categories.${categoryOption.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())}`,
            )}
          </Button>
        ))}
      </div>
    </div>
  )
}
