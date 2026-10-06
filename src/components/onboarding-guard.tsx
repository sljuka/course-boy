import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAppState } from '@/lib/use-app-state'

type OnboardingGuardProps = {
  children: ReactNode
}

function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { isLoaded, isOnboarded, submittedName } = useAppState()
  const location = useLocation()

  if (!isLoaded) {
    return null
  }

  if (!isOnboarded) {
    // A new profile already has its name (given in the launcher): go on from
    // the persona.
    return <Navigate replace state={{ from: location }} to={submittedName ? '/onboarding/persona' : '/onboarding'} />
  }

  return <>{children}</>
}

export { OnboardingGuard }
