import type { Locale } from '@/lib/i18n'

export type Category =
  | 'pre-school'
  | 'elementary-school'
  | 'high-school'
  | 'other'

export type UserPreferences = {
  category?: Category
  locale?: Locale
  nickname?: string
}
