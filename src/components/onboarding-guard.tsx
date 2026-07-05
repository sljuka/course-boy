import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAppState } from '@/lib/use-app-state'

type OnboardingGuardProps = {
  children: ReactNode
}

function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { isLoaded, isOnboarded } = useAppState()
  const location = useLocation()

  if (!isLoaded) {
    return null
  }

  if (!isOnboarded) {
    return <Navigate replace state={{ from: location }} to="/onboarding" />
  }

  return <>{children}</>
}

export { OnboardingGuard }
