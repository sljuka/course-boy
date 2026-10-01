import { MoreHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppState } from '@/lib/use-app-state'

// The app's menu (Settings, About, Logout) behind an icon button, so it fits
// in the sidebar header row next to the language switcher.
function AppMenu() {
  const navigate = useNavigate()
  const { logout } = useAppState()
  const { t } = useTranslation()

  function handleLogout() {
    logout()
    navigate('/onboarding')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={t('menu.open')}
            shape="circle"
            size="icon"
            title={t('menu.open')}
            variant="subtle"
          />
        }
      >
        <MoreHorizontal aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-44">
        <DropdownMenuItem onClick={() => navigate('/settings')}>{t('menu.settings')}</DropdownMenuItem>
        <DropdownMenuItem>{t('menu.about')}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} variant="destructive">
          {t('menu.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { AppMenu }
