import { useState } from 'react'
import { Menu } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useAppState } from '@/lib/use-app-state'

function AppMenu() {
  const navigate = useNavigate()
  const { logout } = useAppState()
  const [isOpen, setIsOpen] = useState(false)

  function handleLogout() {
    logout()
    setIsOpen(false)
    navigate('/onboarding')
  }

  return (
    <div className="relative">
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 transition-colors hover:bg-stone-50"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <Menu aria-hidden="true" className="h-4 w-4" />
      </button>
      {isOpen ? (
        <div className="absolute right-0 top-12 z-50 min-w-40 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_18px_40px_-24px_rgba(41,37,36,0.3)]">
          <button
            className="block w-full px-4 py-3 text-left text-sm text-stone-700 transition-colors hover:bg-stone-50"
            type="button"
          >
            Settings
          </button>
          <button
            className="block w-full px-4 py-3 text-left text-sm text-stone-700 transition-colors hover:bg-stone-50"
            type="button"
          >
            About
          </button>
          <button
            className="block w-full border-t border-stone-200 px-4 py-3 text-left text-sm text-rose-600 transition-colors hover:bg-rose-50"
            onClick={handleLogout}
            type="button"
          >
            Logout
          </button>
        </div>
      ) : null}
    </div>
  )
}

export { AppMenu }
