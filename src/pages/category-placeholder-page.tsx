import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'

import { InDevelopment } from '@/components/in-development'
import type { Category } from '@/lib/preferences'
import { useAppState } from '@/lib/use-app-state'

type CategoryPlaceholderPageProps = {
  category: Category
}

export const CategoryPlaceholderPage = ({
  category: expectedCategory,
}: CategoryPlaceholderPageProps) => {
  const { category, role, setCategory } = useAppState()

  useEffect(() => {
    if (category !== expectedCategory) {
      setCategory(expectedCategory)
    }
  }, [category, expectedCategory, setCategory])

  if (role !== 'student') {
    return <Navigate replace to={role === 'teacher' ? '/teacher' : '/'} />
  }

  return <InDevelopment fallbackPath="/" />
}
