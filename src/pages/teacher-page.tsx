import { Navigate } from 'react-router-dom'

import { InDevelopment } from '@/components/in-development'
import { useAppState } from '@/lib/use-app-state'

export const TeacherPage = () => {
  const { role } = useAppState()

  if (role !== 'teacher') {
    return <Navigate replace to="/" />
  }

  return <InDevelopment fallbackPath="/onboarding/role" />
}
