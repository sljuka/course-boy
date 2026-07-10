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
      elementarySchool: {
        subjects: {
          additionAndSubtraction: 'Addition and subtraction',
          numbersTo20: 'Numbers to 20',
          shapesAndMeasurement: 'Shapes and measurement',
        },
        subtitle: 'Choose a 1st-grade math topic to continue.',
        title: 'Serbian elementary school 1st grade math',
      },
      back: 'Back',
      continue: 'Continue',
      courseDescriptions: {
        preSchoolDescription:
          'Early learning through play, language, counting, and creative activities.',
        programmingDescription:
          'A practical path into coding, problem solving, and building digital projects.',
        serbianElementarySchoolDescription:
          'First-grade math topics aligned with the Serbian elementary-school curriculum.',
      },
      courseItems: {
        additionAndSubtraction: {
          description: 'Practice adding and subtracting with simple first-grade exercises.',
          title: 'Addition and subtraction',
        },
        appThinking: {
          description: 'Think through screens, flows, and interactions behind simple apps.',
          title: 'App thinking',
        },
        buildProjects: {
          description: 'Create simple interactive projects and learn by making.',
          title: 'Build projects',
        },
        colorsAndShapes: {
          description: 'Recognize colors and basic shapes through simple playful tasks.',
          title: 'Colors and shapes',
        },
        compareNumbers: {
          description: 'Compare larger and smaller numbers with simple visual practice.',
          title: 'Compare numbers',
        },
        creativeCoding: {
          description: 'Mix art, motion, and code in playful programming exercises.',
          title: 'Creative coding',
        },
        debuggingBasics: {
          description: 'Spot simple mistakes and learn how to fix broken code step by step.',
          title: 'Debugging basics',
        },
        firstNumbers: {
          description: 'Start counting, comparing, and recognizing simple numbers.',
          title: 'First numbers',
        },
        gameLogic: {
          description: 'Learn programming ideas by building simple game rules and interactions.',
          title: 'Game logic',
        },
        lettersAndSounds: {
          description: 'Meet letters, sounds, and early reading patterns.',
          title: 'Letters and sounds',
        },
        logicAndAlgorithms: {
          description: 'Practice step-by-step thinking and simple algorithms.',
          title: 'Logic and algorithms',
        },
        math: {
          description: 'Work through arithmetic, reasoning, and core math practice.',
          title: 'Math',
        },
        mathGames: {
          description: 'Reinforce first-grade math skills through playful practice.',
          title: 'Math games',
        },
        natureAndSeasons: {
          description: 'Explore weather, plants, animals, and seasonal changes.',
          title: 'Nature and seasons',
        },
        numbersTo20: {
          description: 'Count, compare, and recognize numbers up to 20.',
          title: 'Numbers to 20',
        },
        playAndCreate: {
          description: 'Learn through drawing, games, and hands-on exploration.',
          title: 'Play and create',
        },
        patternsAndSequences: {
          description: 'Notice, continue, and build simple number and shape patterns.',
          title: 'Patterns and sequences',
        },
        programmingBasics: {
          description: 'Understand variables, sequences, and basic coding ideas.',
          title: 'Programming basics',
        },
        puzzlesAndLogic: {
          description: 'Use matching, patterns, and simple puzzles to build thinking skills.',
          title: 'Puzzles and logic',
        },
        rhythmAndSongs: {
          description: 'Practice listening, movement, and memory through music and songs.',
          title: 'Rhythm and songs',
        },
        shapesAndMeasurement: {
          description: 'Explore basic shapes, sizes, length, and simple measurement.',
          title: 'Shapes and measurement',
        },
        socialSkills: {
          description: 'Practice sharing, turn-taking, and everyday communication.',
          title: 'Social skills',
        },
        timeAndCalendar: {
          description: 'Read hours, days, and simple calendar patterns.',
          title: 'Time and calendar',
        },
        webBasics: {
          description: 'Start with pages, links, and the building blocks of the web.',
          title: 'Web basics',
        },
        wordProblems: {
          description: 'Solve short story-based exercises using first-grade math.',
          title: 'Word problems',
        },
      },
      courses: {
        preSchool: 'Pre-school',
        programming: 'Programming',
        serbianElementarySchool: 'Serbian elementary school 1st grade math',
      },
      coursesSubtitle:
        'Choose a course to continue. More courses will be added here over time.',
      coursesTitle: 'Choose a course',
      favoriteCourse: 'Favorite course',
      removeFavoriteCourse: 'Remove favorite course',
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
      elementarySchool: {
        subjects: {
          additionAndSubtraction: 'Sabiranje i oduzimanje',
          numbersTo20: 'Brojevi do 20',
          shapesAndMeasurement: 'Oblici i merenje',
        },
        subtitle: 'Odaberi temu iz matematike za prvi razred da nastaviš dalje.',
        title: 'Matematika za 1. razred srpske osnovne škole',
      },
      back: 'Nazad',
      continue: 'Nastavi',
      courseDescriptions: {
        preSchoolDescription:
          'Rano učenje kroz igru, jezik, brojanje i kreativne aktivnosti.',
        programmingDescription:
          'Praktičan ulaz u kodiranje, rešavanje problema i pravljenje digitalnih projekata.',
        serbianElementarySchoolDescription:
          'Teme iz matematike za prvi razred usklađene sa nastavom srpske osnovne škole.',
      },
      courseItems: {
        additionAndSubtraction: {
          description: 'Vežbaj sabiranje i oduzimanje kroz jednostavne zadatke za prvi razred.',
          title: 'Sabiranje i oduzimanje',
        },
        appThinking: {
          description: 'Razmišljaj o ekranima, tokovima i interakcijama iza jednostavnih aplikacija.',
          title: 'Razmišljanje o aplikacijama',
        },
        buildProjects: {
          description: 'Pravi jednostavne interaktivne projekte i uči kroz izradu.',
          title: 'Izrada projekata',
        },
        colorsAndShapes: {
          description: 'Prepoznaj boje i osnovne oblike kroz jednostavne razigrane zadatke.',
          title: 'Boje i oblici',
        },
        compareNumbers: {
          description: 'Upoređuj veće i manje brojeve kroz jednostavne vizuelne zadatke.',
          title: 'Poređenje brojeva',
        },
        creativeCoding: {
          description: 'Spoji umetnost, pokret i kod kroz razigrane zadatke programiranja.',
          title: 'Kreativno programiranje',
        },
        debuggingBasics: {
          description: 'Uoči jednostavne greške i uči kako da popraviš kod korak po korak.',
          title: 'Osnove ispravljanja grešaka',
        },
        firstNumbers: {
          description: 'Počni sa brojanjem, poređenjem i prepoznavanjem brojeva.',
          title: 'Prvi brojevi',
        },
        gameLogic: {
          description: 'Uči ideje programiranja kroz pravila jednostavnih igara i interakcija.',
          title: 'Logika igara',
        },
        lettersAndSounds: {
          description: 'Upoznaj slova, glasove i prve obrasce čitanja.',
          title: 'Slova i glasovi',
        },
        logicAndAlgorithms: {
          description: 'Vežbaj razmišljanje korak po korak i jednostavne algoritme.',
          title: 'Logika i algoritmi',
        },
        math: {
          description: 'Vežbaj računanje, zaključivanje i osnovne matematičke veštine.',
          title: 'Matematika',
        },
        mathGames: {
          description: 'Učvrsti matematiku za prvi razred kroz razigrano vežbanje.',
          title: 'Matematičke igre',
        },
        natureAndSeasons: {
          description: 'Istražuj vreme, biljke, životinje i promene kroz godišnja doba.',
          title: 'Priroda i godišnja doba',
        },
        numbersTo20: {
          description: 'Broj, upoređuj i prepoznaj brojeve do 20.',
          title: 'Brojevi do 20',
        },
        playAndCreate: {
          description: 'Uči kroz crtanje, igru i praktično istraživanje.',
          title: 'Igra i stvaranje',
        },
        patternsAndSequences: {
          description: 'Uoči, nastavi i gradi jednostavne obrasce sa brojevima i oblicima.',
          title: 'Obrasci i nizovi',
        },
        programmingBasics: {
          description: 'Razumi promenljive, nizove koraka i osnovne ideje programiranja.',
          title: 'Osnove programiranja',
        },
        puzzlesAndLogic: {
          description: 'Koristi slagalice, obrasce i jednostavne zadatke za razvoj mišljenja.',
          title: 'Slagalice i logika',
        },
        rhythmAndSongs: {
          description: 'Vežbaj slušanje, pokret i pamćenje kroz muziku i pesme.',
          title: 'Ritam i pesme',
        },
        shapesAndMeasurement: {
          description: 'Upoznaj osnovne oblike, veličine, dužine i jednostavno merenje.',
          title: 'Oblici i merenje',
        },
        socialSkills: {
          description: 'Vežbaj deljenje, smenjivanje i svakodnevnu komunikaciju.',
          title: 'Socijalne veštine',
        },
        timeAndCalendar: {
          description: 'Uči sate, dane i jednostavne obrasce u kalendaru.',
          title: 'Vreme i kalendar',
        },
        webBasics: {
          description: 'Počni sa stranicama, linkovima i osnovnim delovima veba.',
          title: 'Osnove veba',
        },
        wordProblems: {
          description: 'Rešavaj kratke tekstualne zadatke uz matematiku prvog razreda.',
          title: 'Tekstualni zadaci',
        },
      },
      courses: {
        preSchool: 'Predškolsko',
        programming: 'Programiranje',
        serbianElementarySchool: 'Matematika za 1. razred srpske osnovne škole',
      },
      coursesSubtitle:
        'Odaberi kurs za nastavak. Vremenom će ovde biti dodato još kurseva.',
      coursesTitle: 'Izaberi kurs',
      favoriteCourse: 'Omiljeni kurs',
      removeFavoriteCourse: 'Ukloni omiljeni kurs',
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
      elementarySchool: {
        subjects: {
          additionAndSubtraction: 'Сабирање и одузимање',
          numbersTo20: 'Бројеви до 20',
          shapesAndMeasurement: 'Облици и мерење',
        },
        subtitle: 'Одабери тему из математике за први разред да наставиш даље.',
        title: 'Математика за 1. разред српске основне школе',
      },
      back: 'Назад',
      continue: 'Настави',
      courseDescriptions: {
        preSchoolDescription:
          'Рано учење кроз игру, језик, бројање и креативне активности.',
        programmingDescription:
          'Практичан улаз у кодирање, решавање проблема и прављење дигиталних пројеката.',
        serbianElementarySchoolDescription:
          'Теме из математике за први разред усклађене са наставом српске основне школе.',
      },
      courseItems: {
        additionAndSubtraction: {
          description: 'Вежбај сабирање и одузимање кроз једноставне задатке за први разред.',
          title: 'Сабирање и одузимање',
        },
        appThinking: {
          description: 'Размишљај о екранима, токовима и интеракцијама иза једноставних апликација.',
          title: 'Размишљање о апликацијама',
        },
        buildProjects: {
          description: 'Прави једноставне интерактивне пројекте и учи кроз израду.',
          title: 'Израда пројеката',
        },
        colorsAndShapes: {
          description: 'Препознај боје и основне облике кроз једноставне разигране задатке.',
          title: 'Боје и облици',
        },
        compareNumbers: {
          description: 'Упоређуј веће и мање бројеве кроз једноставне визуелне задатке.',
          title: 'Поређење бројева',
        },
        creativeCoding: {
          description: 'Споји уметност, покрет и код кроз разигране задатке програмирања.',
          title: 'Креативно програмирање',
        },
        debuggingBasics: {
          description: 'Уочи једноставне грешке и учи како да поправиш код корак по корак.',
          title: 'Основе исправљања грешака',
        },
        firstNumbers: {
          description: 'Почни са бројањем, поређењем и препознавањем бројева.',
          title: 'Први бројеви',
        },
        gameLogic: {
          description: 'Учи идеје програмирања кроз правила једноставних игара и интеракција.',
          title: 'Логика игара',
        },
        lettersAndSounds: {
          description: 'Упознај слова, гласове и прве обрасце читања.',
          title: 'Слова и гласови',
        },
        logicAndAlgorithms: {
          description: 'Вежбај размишљање корак по корак и једноставне алгоритме.',
          title: 'Логика и алгоритми',
        },
        math: {
          description: 'Вежбај рачунање, закључивање и основне математичке вештине.',
          title: 'Математика',
        },
        mathGames: {
          description: 'Учврсти математику за први разред кроз разиграно вежбање.',
          title: 'Математичке игре',
        },
        natureAndSeasons: {
          description: 'Истражуј време, биљке, животиње и промене кроз годишња доба.',
          title: 'Природа и годишња доба',
        },
        numbersTo20: {
          description: 'Број, пореди и препознај бројеве до 20.',
          title: 'Бројеви до 20',
        },
        playAndCreate: {
          description: 'Учи кроз цртање, игру и практично истраживање.',
          title: 'Игра и стварање',
        },
        patternsAndSequences: {
          description: 'Уочи, настави и гради једноставне обрасце са бројевима и облицима.',
          title: 'Обрасци и низови',
        },
        programmingBasics: {
          description: 'Разуми променљиве, низове корака и основне идеје програмирања.',
          title: 'Основе програмирања',
        },
        puzzlesAndLogic: {
          description: 'Користи слагалице, обрасце и једноставне задатке за развој мишљења.',
          title: 'Слагалице и логика',
        },
        rhythmAndSongs: {
          description: 'Вежбај слушање, покрет и памћење кроз музику и песме.',
          title: 'Ритам и песме',
        },
        shapesAndMeasurement: {
          description: 'Упознај основне облике, величине, дужине и једноставно мерење.',
          title: 'Облици и мерење',
        },
        socialSkills: {
          description: 'Вежбај дељење, смењивање и свакодневну комуникацију.',
          title: 'Социјалне вештине',
        },
        timeAndCalendar: {
          description: 'Учи сате, дане и једноставне обрасце у календару.',
          title: 'Време и календар',
        },
        webBasics: {
          description: 'Почни са страницама, линковима и основним деловима веба.',
          title: 'Основе веба',
        },
        wordProblems: {
          description: 'Решавај кратке текстуалне задатке уз математику првог разреда.',
          title: 'Текстуални задаци',
        },
      },
      courses: {
        preSchool: 'Предшколско',
        programming: 'Програмирање',
        serbianElementarySchool: 'Математика за 1. разред српске основне школе',
      },
      coursesSubtitle:
        'Одабери курс за наставак. Временом ће овде бити додато још курсева.',
      coursesTitle: 'Изабери курс',
      favoriteCourse: 'Омиљени курс',
      removeFavoriteCourse: 'Уклони омиљени курс',
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
