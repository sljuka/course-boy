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
  // The course page's right panel (Details): open or closed.
  courseInfoPanel?: ExplorerPanelPreference
  explorerPanel?: ExplorerPanelPreference
  // Home: compact rows ("table") or cards ("list").
  homeView?: CourseListView
  locale?: Locale
  // My courses: compact rows ("table") or cards ("list").
  myCoursesView?: CourseListView
  // A program's page (SLJ-64).
  programView?: CourseListView
  nickname?: string
  persona?: Persona
  // Imported courses: how many versions before the current one are kept on this
  // device, for going back (SLJ-40). 2 when unset; 0–10.
  previousVersionsToKeep?: number
  // The name the teacher's courses and programs carry, shown to students next
  // to their Publisher ID; unset or "" for none.
  publisherName?: string
  recentlyViewed?: RecentlyViewedEntry[]
  role?: UserRole
  // Bundled courses (Getting Started) on Home and in recently viewed; on when unset.
  showBundledCourses?: boolean
  // Course mnemonics in lessons (and tests that allow them); on when unset.
  showMnemonics?: boolean
  // SLJ-129: keep sharing when the window is closed (unset: not asked yet),
  // and start at login (in the menu bar, no window).
  keepSharingInBackground?: boolean
  openAtLogin?: boolean
  // A test opens in interactive mode, one question at a time (SLJ-132); on
  // when unset. Off: it opens in paper mode.
  startTestsInteractive?: boolean
  // Programs recolor the app with their theme on their page and in their
  // courses (SLJ-32); on when unset.
  useProgramThemes?: boolean
  // The course editor's right panel (Versions): open or closed.
  versionsPanel?: ExplorerPanelPreference
  theme?: Theme
}
