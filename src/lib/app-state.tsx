import {
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import { detectLocale, i18n, type Locale } from '@/lib/i18n'
import type { Category, Persona, Theme, UserRole } from '@/lib/preferences'
import { AppStateContext } from '@/lib/use-app-state'

function detectTheme(): Theme {
  if (typeof window === 'undefined' || !window.matchMedia) {
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

  useEffect(() => {
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

  function logout() {
    setNicknameState('')
    setSubmittedName('')
    setCategoryState(null)
    setRoleState(null)
    setPersonaState(null)
    void window.preferences.resetOnboarding()
  }

  const value = {
    category,
    isLoaded,
    isOnboarded: Boolean(submittedName && persona && role),
    locale,
    logout,
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
