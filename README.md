# Course boy

**Course boy is a local-first course making, sharing and taking app, built in a way so that learning can never be offline**

Course boy is designed to work without a cloud account or a central course-hosting service: course files live on your device, and teachers can share them directly with students over a peer-to-peer network, pen drives or on paper.

Course boy gives teachers a practical way to create and share learning materials while giving students a simple way to use them, online or offline. It aims to make knowledge easier to create, carry, print, and pass from person to person, with control kept in the hands of the people who teach and learn.

## Local first

Course content is made from Markdown files for written material, JSON for structured course data, and assets like videos, images and files. These files define a course's sections, lessons, and tests. Keeping the content in readable, ordinary formats makes courses easier to inspect, preserve, and move between devices. Courses don't contain any code, to avoid XSS attacks.

Course boy is a desktop app today; a mobile app is planned. It is not intended to run in a browser: Course boy's peer-to-peer networking uses the [Bare](https://github.com/holepunchto/bare) runtime, which needs UDP sockets that browsers don't expose.

## Open course standard

A course is organized into sections, and each section holds lessons and tests. A lesson is a document a teacher (or group of teachers) writes for students to read, watch and listen to; a test is a set of exercises a student answers and gets graded on.

Nothing about the format is proprietary. Because a course package is just files on disk, it survives the app that made it, and — since it's not a binary blob — it can be consumed by other apps or services too.

Video, images and other static assets are packaged inside the course's own folder alongside its lessons and tests — a course never references an asset that lives outside it. That's what keeps a course a single, self-contained unit that can be copied, handed off, or shared on the peer network as one thing.

## Creation experience

Lessons are written in a block-based document editor: headings, formatted text, images, video, and audio can all live in the same document. A lesson can also embed an exercise directly inline, so a teacher can ask a question in the middle of the material instead of only at the end in a separate test. The same document is shown to students in a read-only view, so a lesson looks and behaves the same whether you're writing it or taking it.

Tests are made up of exercises. There are a few exercise types today: `numeric template` (a story with variables and a formula), `multiple choice`, `word types` (tagging highlighted words by grammatical type), `missing words` (fill in the blank), and three diagram-based types — `region picker`, `region marker`, and `region label` (good for geography — countries, continents, marking regions on a map; the diagrams behind these are SVG files).

Tests have randomization baked in. In template exercises, variables can take a different value every time a test is started — a teacher defines constraints per variable (min/max, odd/even), and a random value satisfying them is drawn each run. Exercises within a test can also be tagged (e.g. easy/medium/hard); a teacher defines that a test consists of, say, 3 easy, 2 medium and 2 hard exercises, and each attempt draws randomly from the pool for each tag.

Exercise types — and potentially other parts of the app — are planned to be extendable through third-party plugins in the future, similar to how editors like VS Code support extensions.

## Print-friendly

The same lesson and test that render on screen also have a print layout, so paper is a first-class way to take a course — not an afterthought. No device and no network are required to use a printed course; a teacher can author on Course boy and hand out paper without either side needing the app again.

## Ownership & control (Roadmap)

A course's publishing key doesn't have to belong to one person. The plan is m-of-n multisig control over a course's identity, so an individual teacher can own a course outright, or a school can require several staff members to agree before a new version goes out.

## AI agent for teachers (Roadmap)

The plan is an agent that reads a lesson's content and suggests exercises to pair with it, and recommends how to structure a new course — how many sections, what exercise types fit the subject — instead of a teacher starting from a blank editor every time.

Course authoring is planned to be exposed as MCP tools, so a teacher can build a course from Claude, or any other MCP client, not only Course boy's own editor. The course schema is already usable this way experimentally — this was tried locally with Claude, and an agent already creates new courses this way whenever the e2e suite runs.

## AI companion for students (Roadmap)

A student would be able to talk with an agent through a plain text interface, or interact with an animated mascot instead — the same agent that helps teachers author courses, offering a hint on a stuck question, a short explanation of why an answer was marked wrong, encouragement to keep going.

The same agent would also help figure out what to learn next — from a stated goal (say "electrical engineering" and get a path through the math, physics, and electronics courses it builds on), an existing hobby (3D printing, composting, and the like), or a course already underway (pointing to other courses that would fill a gap or go deeper on the topic).

The animated mascot is planned as a 3D character built with react-three-fiber (see wawa-sensei's [tutorial](https://youtu.be/2W_VR92Pqgs?si=644IrANWVlb-ZFJn)), similar in spirit to Brilliant's mascot. It could be gamified — unlocking new characters by finishing a course or stringing together a run of correct answers.

## Peer-to-peer sharing

Peer-to-peer sharing is built around Bare workers and holepunching. A teacher can share a course as a QR code in a classroom or online; students scan it to download the course directly from peers and then take it within the app. Courses can also move on pen drives — passed around, or (only half in jest) strapped to a messenger pigeon or drone for remote or hostile terrain.

When students import a course, their devices can keep sharing its files with other peers while the app is running, so the network is supported by the people using it rather than a central hosting provider. Optional, blinded seedbox-like services can help kick-start a new course by seeding it until enough peers are sharing it — they support the network, they're not a required central service.

A course can also be gated to a set of vetted peers, so only people a teacher has explicitly invited can import it.

## Version control

A course is edited as a draft, and a teacher explicitly cuts a version (using semver) when it's ready to go out. Sharing on the peer-to-peer network always points at a specific version, not a moving draft.

1. **Draft** — edit sections, lessons, and tests freely.
2. **Cut a version** — snapshot the draft as something shareable.
3. **Publish** — choose which version students see.
4. **Revert** — bring an older version back into the draft.

## Mobile & desktop

Course boy runs today as a desktop app (Electron), with the full authoring and peer-to-peer experience available. A mobile app is planned. Browser isn't a good fit: the peer-to-peer layer uses UDP sockets, which browsers don't expose.

## Easy onboarding for non-technical teachers

Getting started only takes a nickname. A teacher who just wants to write a course, print it, or hand it out on a pen drive never has to touch a keypair to do it — and students never need one at all.

Setting up a sharing identity is a separate, dedicated onboarding step of its own — it only shows up once a teacher is ready to publish a course over the peer-to-peer network, not before. Peer-to-peer work runs in a separate native worker, and sharing is always an explicit choice; the keypair behind it is a teacher's persistent sharing identity, so it should be protected — it can't simply be replaced without changing that identity.

Course boy is an evolving project, so none of this should be read as a claim that every part of the app or network has undergone an independent security audit.

## Current implementation

Course boy is built with Electron, Vite, React, and TypeScript. Course packages are stored as files on disk. The peer-to-peer layer uses Bare, Hyperswarm, Corestore, and Hyperdrive. The app currently supports course authoring, printing, publishing, and peer-to-peer course sharing and importing. See [CLAUDE.md](CLAUDE.md) and the [project docs](docs/) for architecture and implementation details.

## Future plan

- Integrate bitcoin donations to teachers. Detect if a teacher has left bitcoin info like bolt12 or a BTC address in their course and suggest a donation when the course is finished.
- More exercise types (draw shapes/3D figures with react-three-fiber, calculate area or circumference, support math LaTeX notation).
- Try to make a p2p course indexer (perhaps using Autobus), not using centralized services.
- Try to make p2p teacher pages, where a student can open a teacher's page and see every course they've authored, also without centralized services.
- React with emoji on a course, and perhaps feedback too (not sure feedback is feasible without a centralized service — it would probably open the teacher's email or an alternative contact if they provided one).
- UX for forking existing courses.
- Exploration: paid, bespoke courses over p2p — a student sends their public key, a teacher makes a tailored course and signs it with both keys, and it's only sent once payment (e.g. via bolt12) is made. Likely a variant of the existing gated-course mechanism (an invite for one peer) rather than a new primitive — no other student is downloading it, so it wouldn't get the usual seeding benefit.

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

Course boy is licensed under [AGPL-3.0-or-later](LICENSE).
