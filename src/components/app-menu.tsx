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
import { IndicatorDot } from '@/components/ui/indicator-dot'
import { needsIdentityBackup, useIdentityBackupStatusQuery } from '@/lib/identity-backup-queries'
import { useAppState } from '@/lib/use-app-state'

// The app's menu (Settings, About, Logout) behind an icon button, so it fits
// in the sidebar header row next to the language switcher.
function AppMenu() {
  const navigate = useNavigate()
  const { logout } = useAppState()
  const { t } = useTranslation()
  // The publisher identity isn't backed up (SLJ-53): a dot on the menu and on
  // Settings, until it is.
  const { data: backupStatus } = useIdentityBackupStatusQuery()
  const showBackupReminder = needsIdentityBackup(backupStatus)
  const menuLabel = showBackupReminder ? `${t('menu.open')} · ${t('identityBackup.reminder')}` : t('menu.open')

  function handleLogout() {
    logout()
    navigate('/onboarding')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={menuLabel}
            className="relative"
            data-testid="app-menu"
            shape="circle"
            size="icon"
            title={menuLabel}
            variant="subtle"
          />
        }
      >
        <MoreHorizontal aria-hidden="true" />
        {showBackupReminder && <IndicatorDot className="absolute top-0 right-0" data-testid="backup-reminder-dot" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-44">
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          {t('menu.settings')}
          {showBackupReminder && <IndicatorDot className="ml-auto" />}
        </DropdownMenuItem>
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
