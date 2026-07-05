import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  en: {
    translation: {
      categories: {
        elementarySchool: '📘 Elementary school',
        highSchool: '🎓 High school',
        other: '✨ Other',
        preSchool: '🧸 Pre-school',
      },
      categorySubtitle:
        'Pick the learning level that fits what you want to explore first.',
      categoryTitle: 'Choose a category',
      continue: 'Continue',
      language: {
        english: 'English',
        serbian: 'Srpski',
      },
      nameHint:
        "You don't need to use your real name. This isn't a government office. You can use a nickname like 'Lizard' or 'Quacky McDuck'. In general, it's better not to share personal data when there's no real need. Of course, you can use your real name too. Your choice.",
      nameLabel: 'what should I call you?',
      namePlaceholder: 'Type a name or nickname',
      niceToMeetYou: 'Nice to meet you, {{name}}.',
      welcomeSubtitle:
        'Matko is an open platform for creating tutorials and tests, and for solving those tests either on the platform or on paper. The format is print-friendly, with a focus on making new tests easy to create, easy to complete, and enjoyable to learn from 😊',
      welcomeTitle: 'Welcome! 😊',
    },
  },
  sr: {
    translation: {
      categories: {
        elementarySchool: '📘 Osnovna škola',
        highSchool: '🎓 Srednja škola',
        other: '✨ Ostalo',
        preSchool: '🧸 Predškolsko',
      },
      categorySubtitle:
        'Odaberi nivo učenja koji najbolje odgovara onome što želiš prvo da istražiš.',
      categoryTitle: 'Izaberi kategoriju',
      continue: 'Nastavi',
      language: {
        english: 'English',
        serbian: 'Srpski',
      },
      nameHint:
        "Ne moraš koristiti svoje pravo ime. Nije ovo MUP 👮. Možeš koristiti nadimak tipa 'Gušter 🦎' ili 'Patak Kvakanović'. Generalno ne treba unositi lične podatke gde nema potrebe. Naravno, može i lično ime da se koristi, izbor je na tebi.",
      nameLabel: 'Kako želiš da te oslovljavam?',
      namePlaceholder: 'Unesi ime ili nadimak',
      niceToMeetYou: 'Drago mi je, {{name}}.',
      welcomeSubtitle:
        'Matko je otvorena mreža za kreiranje tutorijala, testova kao i rešavanje kreiranih testova na platformi ili papiru (testovi su pogodnog formata za štampanje). Nadamo se da će te uživati u učenju novih stvari',
      welcomeTitle: 'Dobrodošli! 😊',
    },
  },
} as const

export const locales = ['en', 'sr'] as const
export type Locale = (typeof locales)[number]

export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') {
    return 'en'
  }

  const preferredLocales = navigator.languages?.length
    ? navigator.languages
    : [navigator.language]

  for (const locale of preferredLocales) {
    const normalizedLocale = locale.toLowerCase()

    if (normalizedLocale.startsWith('sr')) {
      return 'sr'
    }

    if (normalizedLocale.startsWith('en')) {
      return 'en'
    }
  }

  return 'en'
}

void i18n.use(initReactI18next).init({
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  lng: 'en',
  resources,
})

export { i18n }
