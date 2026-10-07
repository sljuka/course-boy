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

// The app's menu (Settings, About, Switch profile) behind an icon button, so it fits
// in the sidebar header row next to the language switcher.
function AppMenu() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const menuLabel = t('menu.open')

  // Back to the profile picker (SLJ-57): the app restarts into the launcher.
  function handleSwitchProfile() {
    void window.profiles.switchProfile()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={menuLabel}
            data-testid="app-menu"
            shape="circle"
            size="icon"
            title={menuLabel}
            variant="subtle"
          />
        }
      >
        <MoreHorizontal aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-44">
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          {t('menu.settings')}
        </DropdownMenuItem>
        <DropdownMenuItem>{t('menu.about')}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem data-testid="switch-profile" onClick={handleSwitchProfile}>
          {t('menu.switchProfile')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { AppMenu }
