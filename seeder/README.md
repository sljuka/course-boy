# Matko seeder

Keeps Matko courses, programs and channels online on a computer that's always on, such
as a home server, a Raspberry Pi or a small VPS. Students can then import and update them
while the teacher's computer is off (SLJ-144).

It runs the app's own peer-to-peer worker (`workers/main.cjs`) without Electron or a
display, and keeps a full copy of each course's current version. When the teacher
publishes a new version, it fetches that too. It never holds a publishing identity: it
can't publish, sign or change anything, only serve what's already published.

## Use

From the repository, with Node 22 or later and `npm install` done:

```sh
node seeder/cli.mjs add <code>          # a code, as Share shows it, or a matko://import/… link
node seeder/cli.mjs run                 # keeps everything on the list online, until stopped
node seeder/cli.mjs status              # what the running seeder keeps
node seeder/cli.mjs list                # the codes on the list
node seeder/cli.mjs remove <code>
```

`add` and `remove` work whether or not `run` is running; a running seeder picks the
change up within a few seconds. Stop it with Ctrl-C or SIGTERM.

`--data <dir>` chooses where it keeps everything (default: `$MATKO_SEED_DATA`, or
`~/.matko-seed`):

```
<data>/
  store/        the courses' data
  kept.json     the codes to keep
  status.json   what the running seeder keeps now
  seeder.pid    the running seeder; only one runs per folder
```

Gated courses (shared only with chosen students) can't be kept: a seeder isn't a vetted
student.

## Not yet

- Packaged builds that don't need the repository, and running it as a service
  (systemd, launchd).
- Pairing with the app, so every Publish adds the course on its own (SLJ-188).
