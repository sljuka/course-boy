import type { Locale } from '@/lib/i18n'

export type Category =
  | 'pre-school'
  | 'elementary-school'
  | 'high-school'
  | 'other'

export type UserRole = 'student' | 'teacher'

export type UserPreferences = {
  category?: Category
  hasAcknowledgedCreatorKey?: boolean
  locale?: Locale
  nickname?: string
  role?: UserRole
}
