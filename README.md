# Matko

**Matko is a local-first course authoring and sharing app, built for freedom, privacy, and learning together.**

Courses should belong to the people who create and use them. Matko is designed to work without a cloud account or a central course-hosting service: course files live on your device, and teachers can share them directly with students over a peer-to-peer network or on paper.

Matko gives teachers a practical way to create and share learning materials while giving students a simple way to use them, online or offline. It aims to make knowledge easier to create, carry, print, and pass from person to person, with control kept in the hands of the people who teach and learn.

## The plan

Matko is planned for desktop and native mobile. It is not intended to run in a browser: Matko's peer-to-peer networking runs in a [Bare](https://github.com/holepunchto/bare) runtime, which browsers do not support.

Course content is made from portable files: localized Markdown for written material, and JSON for structured course data. Together, these files describe a course's sections, lessons, and tests. Keeping the content in readable, ordinary formats makes courses easier to inspect, preserve, and move between devices.

Matko has two ways to share a course:

- **Print:** Students can use printed course materials, with a player and print layout designed to make paper a first-class way to learn.
- **Peer to peer:** A teacher can share a course QR code in a classroom or online. Students scan it to download the course directly from peers and then take it in Matko.

Peer-to-peer sharing is built around Bare workers and holepunching. When students import a course, their devices can keep sharing its files with other peers while Matko is running. The network can therefore be supported by the people using it, rather than depending on a central hosting provider. Optional always-on seedboxes can help a new course get started by keeping it available until enough peers are sharing it. They support the network; they are not meant to be a required central service.

## Privacy, security, and identity

Matko is designed to keep course work local and avoid requiring a cloud account. Students can use the app without setting up a keypair. A teacher only needs a persistent sharing identity when they choose to publish courses through the peer-to-peer network; creating that identity is not required to write or print courses.

Security is part of the design, including keeping peer-to-peer work in a separate native worker and making sharing an explicit choice. A keypair provides a persistent identity for sharing; it should be protected because it cannot simply be replaced without changing that identity. Matko is an evolving project, so these design goals should not be read as a claim that every part of the app or network has undergone an independent security audit.

## Current implementation

Matko is built with Electron, Vite, React, and TypeScript. Course packages are stored as files on disk. The peer-to-peer layer uses Bare, Hyperswarm, Corestore, and Hyperdrive. The app currently supports course authoring and playback, print layouts, publishing, and peer-to-peer course sharing and importing. See [CLAUDE.md](CLAUDE.md) and the [project docs](docs/) for architecture and implementation details.

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
