import type { Locale } from '@/lib/i18n'
import type { CourseListView } from '@/lib/course-list-view'
import type { ExplorerPanelPreference } from '@/lib/explorer-panel'
import type { RecentlyViewedEntry } from '@/lib/recently-viewed'

export type Category =
  | 'pre-school'
  | 'elementary-school'
  | 'high-school'
  | 'other'

export type UserRole = 'student' | 'teacher'

export type Persona = 'course-boy' | 'course-girl' | 'course-bot' | 'course-monster'

export type Theme = 'light' | 'dark'

export type UserPreferences = {
  category?: Category
  explorerPanel?: ExplorerPanelPreference
  hasAcknowledgedCreatorKey?: boolean
  locale?: Locale
  // My courses: compact rows ("table") or cards ("list").
  myCoursesView?: CourseListView
  nickname?: string
  persona?: Persona
  recentlyViewed?: RecentlyViewedEntry[]
  role?: UserRole
  // The course editor's right panel (Versions): open or closed.
  versionsPanel?: ExplorerPanelPreference
  theme?: Theme
}
