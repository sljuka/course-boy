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
      back: 'Back',
      categorySubtitle:
        'Pick the learning level that fits what you want to explore first.',
      categoryTitle: 'Choose a category',
      continue: 'Continue',
      inDevelopment: {
        description:
          "This part of Matko is still being built. The teacher workspace isn't ready yet, but the route is in place and will be available soon.",
        title: 'Under development',
      },
      language: {
        english: 'English',
        serbian: 'Srpski',
        serbianCyrillic: 'Српски',
      },
      menu: {
        about: 'About',
        logout: 'Logout',
        settings: 'Settings',
      },
      nameHint:
        "You don't need to use your real name. This isn't a government office. You can use a nickname like 'Lizard' or 'Quacky McDuck'. In general, it's better not to share personal data when there's no real need. Of course, you can use your real name too. Your choice.",
      nameLabel: 'what should I call you?',
      namePlaceholder: 'Type a name or nickname',
      niceToMeetYou: 'Nice to meet you, {{name}}.',
      roleSubtitle:
        'Choose the path that fits how you want to use Matko right now.',
      roleTitle: 'Hi {{name}}, are you a student or a teacher?',
      roles: {
        student: 'Student',
        teacher: 'Teacher',
      },
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
      back: 'Nazad',
      categorySubtitle:
        'Odaberi nivo učenja koji najbolje odgovara onome što želiš prvo da istražiš.',
      categoryTitle: 'Izaberi kategoriju',
      continue: 'Nastavi',
      inDevelopment: {
        description:
          'Ovaj deo Matka se još razvija. Nastavnički radni prostor još nije spreman, ali je ruta postavljena i uskoro će biti dostupna.',
        title: 'U izradi',
      },
      language: {
        english: 'English',
        serbian: 'Srpski',
        serbianCyrillic: 'Српски',
      },
      menu: {
        about: 'O aplikaciji',
        logout: 'Odjavi se',
        settings: 'Podešavanja',
      },
      nameHint:
        "Ne moraš koristiti svoje pravo ime. Nije ovo MUP 👮. Možeš koristiti nadimak tipa 'Gušter 🦎' ili 'Patak Kvakanović'. Generalno ne treba unositi lične podatke gde nema potrebe. Naravno, može i lično ime da se koristi, izbor je na tebi.",
      nameLabel: 'Kako želiš da te oslovljavam?',
      namePlaceholder: 'Unesi ime ili nadimak',
      niceToMeetYou: 'Drago mi je, {{name}}.',
      roleSubtitle:
        'Izaberi putanju koja najbolje odgovara načinu na koji želiš sada da koristiš Matko.',
      roleTitle: 'Zdravo {{name}}, da li si učenik ili nastavnik?',
      roles: {
        student: 'Učenik',
        teacher: 'Nastavnik',
      },
      welcomeSubtitle:
        'Matko je otvorena mreža za kreiranje tutorijala, testova kao i rešavanje kreiranih testova na platformi ili papiru (testovi su pogodnog formata za štampanje). Nadamo se da će te uživati u učenju novih stvari',
      welcomeTitle: 'Dobrodošli! 😊',
    },
  },
  'sr-Cyrl': {
    translation: {
      categories: {
        elementarySchool: '📘 Основна школа',
        highSchool: '🎓 Средња школа',
        other: '✨ Остало',
        preSchool: '🧸 Предшколско',
      },
      back: 'Назад',
      categorySubtitle:
        'Одабери ниво учења који најбоље одговара ономе што желиш прво да истражиш.',
      categoryTitle: 'Изабери категорију',
      continue: 'Настави',
      inDevelopment: {
        description:
          'Овај део Матка се још развија. Наставнички радни простор још није спреман, али је рута постављена и ускоро ће бити доступна.',
        title: 'У изради',
      },
      language: {
        english: 'English',
        serbian: 'Srpski',
        serbianCyrillic: 'Српски',
      },
      menu: {
        about: 'О апликацији',
        logout: 'Одјави се',
        settings: 'Подешавања',
      },
      nameHint:
        "Не мораш користити своје право име. Није ово MUP 👮. Можеш користити надимак типа 'Гуштер 🦎' или 'Патак Квакановић'. Генерално не треба уносити личне податке где нема потребе. Наравно, може и лично име да се користи, избор је на теби.",
      nameLabel: 'Како желиш да те ословљавам?',
      namePlaceholder: 'Унеси име или надимак',
      niceToMeetYou: 'Драго ми је, {{name}}.',
      roleSubtitle:
        'Изабери путању која најбоље одговара начину на који желиш сада да користиш Матко.',
      roleTitle: 'Здраво {{name}}, да ли си ученик или наставник?',
      roles: {
        student: 'Ученик',
        teacher: 'Наставник',
      },
      welcomeSubtitle:
        'Матко је отворена мрежа за креирање туторијала, тестова као и решавање креираних тестова на платформи или папиру (тестови су погодног формата за штампање). Надамо се да ћете уживати у учењу нових ствари',
      welcomeTitle: 'Добродошли! 😊',
    },
  },
} as const

export const locales = ['en', 'sr', 'sr-Cyrl'] as const
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

    if (
      normalizedLocale.startsWith('sr-cyrl') ||
      normalizedLocale.startsWith('sr_rs@cyrillic')
    ) {
      return 'sr-Cyrl'
    }

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
  supportedLngs: locales,
})

export { i18n }
