import {
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react'

import { detectLocale, i18n, type Locale } from '@/lib/i18n'
import type { Category, Persona, Theme, UserRole } from '@/lib/preferences'
import { AppStateContext } from '@/lib/use-app-state'

// The theme to start with: the one index.html already applied (main passes
// the profile's in the address), else the system's.
function detectTheme(): Theme {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
    return 'dark'
  }
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'light'
  }
  if (new URLSearchParams(window.location.search).get('theme') === 'light') {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function AppStateProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectLocale())
  const [nickname, setNicknameState] = useState('')
  const [submittedName, setSubmittedName] = useState('')
  const [category, setCategoryState] = useState<Category | null>(null)
  const [role, setRoleState] = useState<UserRole | null>(null)
  const [persona, setPersonaState] = useState<Persona | null>(null)
  const [theme, setThemeState] = useState<Theme>(() => detectTheme())
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let isMounted = true

    window.preferences
      .get()
      .then((preferences) => {
        if (!isMounted) {
          return
        }

        const nextLocale = preferences.locale || detectLocale()

        setLocaleState(nextLocale)
        void i18n.changeLanguage(nextLocale)
        setNicknameState(preferences.nickname ?? '')
        setSubmittedName(preferences.nickname ?? '')
        setCategoryState(preferences.category ?? null)
        setRoleState(preferences.role ?? null)
        setPersonaState(preferences.persona ?? null)
        setThemeState(preferences.theme ?? detectTheme())
        setIsLoaded(true)
      })
      .catch(() => {
        if (!isMounted) {
          return
        }

        setIsLoaded(true)
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!isLoaded) {
      return
    }

    void window.preferences.set({ locale })
  }, [isLoaded, locale])

  // Before paint, so a frame is never drawn in the other theme.
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  function setLocale(nextLocale: Locale) {
    setLocaleState(nextLocale)
    void i18n.changeLanguage(nextLocale)
  }

  function setNickname(nextNickname: string) {
    setNicknameState(nextNickname)
  }

  function submitNickname(nextNickname: string) {
    setSubmittedName(nextNickname)
    setNicknameState(nextNickname)
    void window.preferences.set({
      locale,
      nickname: nextNickname,
    })
  }

  function setCategory(nextCategory: Category) {
    setCategoryState(nextCategory)
    void window.preferences.set({
      category: nextCategory,
      locale,
      nickname: submittedName,
      role: role ?? undefined,
    })
  }

  function setRole(nextRole: UserRole) {
    setRoleState(nextRole)
    void window.preferences.set({
      locale,
      nickname: submittedName,
      role: nextRole,
    })
  }

  function setPersona(nextPersona: Persona) {
    setPersonaState(nextPersona)
    void window.preferences.set({
      locale,
      nickname: submittedName,
      persona: nextPersona,
    })
  }

  function setTheme(nextTheme: Theme) {
    setThemeState(nextTheme)
    void window.preferences.set({ locale, theme: nextTheme })
  }


  const value = {
    category,
    isLoaded,
    isOnboarded: Boolean(submittedName && persona && role),
    locale,
    nickname,
    persona,
    role,
    submittedName,
    theme,
    setCategory,
    setLocale,
    setNickname,
    setPersona,
    setRole,
    setTheme,
    submitNickname,
  }

  return (
    <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
  )
}

export { AppStateProvider }
