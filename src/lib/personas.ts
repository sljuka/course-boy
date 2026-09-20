import courseBotUrl from '@/assets/course-bot.png'
import courseBoyUrl from '@/assets/course-boy.png'
import courseGirlUrl from '@/assets/course-girl.png'
import courseMonsterUrl from '@/assets/course-monster.png'
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
