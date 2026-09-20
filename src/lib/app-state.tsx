import {
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import { detectLocale, i18n, type Locale } from '@/lib/i18n'
import type { Category, Persona, UserRole } from '@/lib/preferences'
import { AppStateContext } from '@/lib/use-app-state'

function AppStateProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectLocale())
  const [nickname, setNicknameState] = useState('')
  const [submittedName, setSubmittedName] = useState('')
  const [category, setCategoryState] = useState<Category | null>(null)
  const [role, setRoleState] = useState<UserRole | null>(null)
  const [persona, setPersonaState] = useState<Persona | null>(null)
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
    setCategory,
    setLocale,
    setNickname,
    setPersona,
    setRole,
    submitNickname,
  }

  return (
    <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
  )
}

export { AppStateProvider }
