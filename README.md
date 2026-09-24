# Matko

**Matko is a local-first course making, sharing and taking app, built in a way so that learning can never be offline**

Matko is designed to work without a cloud account or a central course-hosting service: course files live on your device, and teachers can share them directly with students over a peer-to-peer network, pen drives or on paper.

Matko gives teachers a practical way to create and share learning materials while giving students a simple way to use them, online or offline. It aims to make knowledge easier to create, carry, print, and pass from person to person, with control kept in the hands of the people who teach and learn.

## The plan

Course content is made from Markdown files for written material, JSON for structured course data, and assets like videos, images, files. these files define course's sections, lessons, and tests. Keeping the content in readable, ordinary formats makes courses easier to inspect, preserve, and move between devices. Courses don't contain any code to avoid XSS attacks. 

Matko has two ways to share a course:

- **Print:** Students can use printed course materials, with a player and print layout designed to make paper a first-class way to learn.
- **Peer to peer:** A teacher can share a course QR code in a classroom or online. Students scan it to download the course directly from peers and then take the course within the app.
- **Pen drives** passed around or wraped on to messenger pidgeons or drones, ready to drop on remote or hostile terrains.

Peer-to-peer sharing is built around Bare workers and holepunching. When students import a course, their devices can keep sharing its files with other peers while the app is running. The network can therefore be supported by the people using it, rather than depending on a central hosting provider. Optional always-on seedboxes can help kick-start a new course by seeding it until enough peers are sharing it. They support the network; they are not meant to be a required central service.

Matko is planned for desktop and native mobile. It is not intended to run in a browser: Matko's peer-to-peer networking uses [Bare](https://github.com/holepunchto/bare) runtime, it requires UDP sockets which browsers do not expose.

## Privacy, security, and identity

Matko is designed to keep course work local and avoid requiring a cloud account. Students can use the app without setting up a keypair. A teacher only needs a persistent sharing identity when they choose to publish courses through the peer-to-peer network; creating that identity is not required to create or print courses.

Security is part of the design, including keeping peer-to-peer work in a separate native worker and making sharing an explicit choice. A keypair provides a persistent identity for sharing; it should be protected because it cannot simply be replaced without changing that identity. Matko is an evolving project, so these design goals should not be read as a claim that every part of the app or network has undergone an independent security audit.

## Current implementation

Matko is built with Electron, Vite, React, and TypeScript. Course packages are stored as files on disk. The peer-to-peer layer uses Bare, Hyperswarm, Corestore, and Hyperdrive. The app currently supports course authoring, printing, publishing, and peer-to-peer course sharing and importing. See [CLAUDE.md](CLAUDE.md) and the [project docs](docs/) for architecture and implementation details.

## Course

A course is organized into sections, and each section holds lessons and tests. A lesson is a document a teacher writes for students to read, watch and listen. a Test is a set of exercises a student answers and gets feedback on his answers.

Lessons are written in a block-based document editor: headings, formatted text, images, video, and audio can all live in the same document. A lesson can also embed an exercise directly inline, so a teacher can ask a question in the middle of the material instead of only at the end in a separate test. The same document is shown to students in a read-only view, so a lesson looks and behaves the same whether you're writing it or taking it.

Tests are consisted out of exercises. There are couple of exercise types: `numeric template exercises` (a story with variables and a formula), `multiple choice`, `word types` (tagging highlighted words), `missing words` (fill in the blank), and three diagram-based types — `region picker`, `region marker`, and `region label` (these are very good for learning geography, countries, continents, marking certain regions on map. regions or diagrams in these exercises are SVG files). Exercise types, and potentially other parts of the app, are planned to be extendable through third-party plugins in the future, similar to how editors like VS Code support extensions.

Tests have randomization baked in. For instance in template exercises, variables can have different value every time a test is started. Teacher defines constraints for each variable (min/max value, odd/even number). Based on this random value is used every time.
Exercises within a test can also be tagged for instance (easy/medium/hard). Teacher defines that test consists of 3 easy, 2 med and 2 hard exercises. Every time student starts a test it would choose exercises randomly (from a pool of all exercises for that test) basesd on the tags.

Teachers can update their courses. Courses use semver versioning.

## Future plan

- AI, make MCP that shares the course schema. Agent (not provided by the app) can use this to help teachers in creating new courses by knowing how the courses are structured. This was tried locally by Claude. Agent now is creating new couses whenever it runs e2e tests. It's not planned to provide agents to students within the app, at least not by default. Perhaps an extension can be used for this purpose.
- Animated mascot, create optional animated mascots that can potentially inspire and make the exerience more interesting (similar like Briliant, but 3d instead). Do this with react-three-fiber and great [wawa-sensei's tutorial](https://youtu.be/2W_VR92Pqgs?si=644IrANWVlb-ZFJn). This can be gamified, for example unlock new characters by solving a course or having a big spree of positive answers from exercises to unlock new content.
- Integrate bitcoin donations to teachers. Detect if teacher has left any bitcoin info like bolt12 or btc address in his course and suggest to donate when course is finished.
- More exercise types (draw shapes 3d figures with react-three-fiber, calculate area, circuverence, support math latex notation)
- Try to make a p2p course indexer (perhaps using Autobus), not using centralized services
- Try to make p2p teacher pages where student can open Teacher's page and see all the courses he has authored, also without any centralized services
- React with emoji on course, perhaps also give feedback on course (I'm not sure feedback is possible, it would probably open teacher's email or alterantive contact in case teacher provided it)
- UX for forking existing courses

## Development

```sh
npm install
npm run dev
```

Useful checks:

```sh
npm run check        # typecheck, lint, tests, and locale parity
npm run check:e2e    # build and exercise the Electron app with Playwright
npm run build        # production build
```

## License

Matko is licensed under [AGPL-3.0-or-later](LICENSE).
