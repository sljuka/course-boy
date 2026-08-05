import { useState } from 'react'
import { Menu } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useAppState } from '@/lib/use-app-state'
import { cn } from '@/lib/utils'

type AppMenuProps = {
  className?: string
}

function AppMenu({ className }: AppMenuProps) {
  const navigate = useNavigate()
  const { logout } = useAppState()
  const [isOpen, setIsOpen] = useState(false)
  const { t } = useTranslation()

  function handleLogout() {
    logout()
    setIsOpen(false)
    navigate('/onboarding')
  }

  return (
    <div className={cn('relative', className)}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-stone-200 bg-white px-3 text-stone-700 transition-colors hover:bg-stone-50"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <Menu aria-hidden="true" className="h-4 w-4" />
      </button>
      {isOpen && (
        <div className="absolute bottom-12 left-0 z-[60] min-w-full overflow-hidden rounded-2xl border border-stone-300/90 bg-white shadow-[0_18px_40px_-24px_rgba(41,37,36,0.3)]">
          <button
            className="block w-full px-4 py-3 text-left text-sm text-stone-700 transition-colors hover:bg-stone-50"
            type="button"
          >
            {t('menu.settings')}
          </button>
          <button
            className="block w-full px-4 py-3 text-left text-sm text-stone-700 transition-colors hover:bg-stone-50"
            type="button"
          >
            {t('menu.about')}
          </button>
          <button
            className="block w-full border-t border-stone-200 px-4 py-3 text-left text-sm text-rose-600 transition-colors hover:bg-rose-50"
            onClick={handleLogout}
            type="button"
          >
            {t('menu.logout')}
          </button>
        </div>
      )}
    </div>
  )
}

export { AppMenu }
