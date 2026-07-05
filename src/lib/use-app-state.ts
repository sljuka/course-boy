import { createContext, useContext } from 'react'

import type { Locale } from '@/lib/i18n'
import type { Category } from '@/lib/preferences'

type AppStateContextValue = {
  category: Category | null
  isLoaded: boolean
  isOnboarded: boolean
  locale: Locale
  nickname: string
  logout: () => void
  submittedName: string
  setCategory: (category: Category) => void
  setLocale: (locale: Locale) => void
  setNickname: (nickname: string) => void
  submitNickname: (nickname: string) => void
}

const AppStateContext = createContext<AppStateContextValue | null>(null)

function useAppState() {
  const context = useContext(AppStateContext)

  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider')
  }

  return context
}

export { AppStateContext, useAppState }
export type { AppStateContextValue }
