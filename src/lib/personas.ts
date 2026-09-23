import courseBotUrl from '@/assets/course-bot.png'
import courseBoyUrl from '@/assets/course-boy.png'
import courseGirlUrl from '@/assets/course-girl.png'
import courseMonsterUrl from '@/assets/course-monster.png'
import courseBotIconUrl from '@/assets/course-bot-icon.png'
import courseBoyIconUrl from '@/assets/course-boy-icon.png'
import courseGirlIconUrl from '@/assets/course-girl-icon.png'
import courseMonsterIconUrl from '@/assets/course-monster-icon.png'
import type { Persona } from '@/lib/preferences'

export const DEFAULT_PERSONA: Persona = 'course-boy'

export const PERSONAS: Array<{ id: Persona; imageUrl: string; labelKey: string }> = [
  { id: 'course-boy', imageUrl: courseBoyUrl, labelKey: 'personas.courseBoy' },
  { id: 'course-girl', imageUrl: courseGirlUrl, labelKey: 'personas.courseGirl' },
  { id: 'course-bot', imageUrl: courseBotUrl, labelKey: 'personas.courseBot' },
  { id: 'course-monster', imageUrl: courseMonsterUrl, labelKey: 'personas.courseMonster' },
]

const IMAGE_URL_BY_PERSONA: Record<Persona, string> = {
  'course-boy': courseBoyUrl,
  'course-girl': courseGirlUrl,
  'course-bot': courseBotUrl,
  'course-monster': courseMonsterUrl,
}

export function getPersonaImageUrl(persona: Persona | null | undefined): string {
  return IMAGE_URL_BY_PERSONA[persona ?? DEFAULT_PERSONA]
}

// A simpler, monochrome-sketch take on the same four characters — used for
// the small always-visible brand mark (e.g. the sidebar's top-left corner)
// instead of the full-color illustration onboarding uses to introduce them.
const ICON_URL_BY_PERSONA: Record<Persona, string> = {
  'course-boy': courseBoyIconUrl,
  'course-girl': courseGirlIconUrl,
  'course-bot': courseBotIconUrl,
  'course-monster': courseMonsterIconUrl,
}

export function getPersonaIconUrl(persona: Persona | null | undefined): string {
  return ICON_URL_BY_PERSONA[persona ?? DEFAULT_PERSONA]
}
