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

## In Docker

The image holds the seeder, the worker and their runtime dependencies only (SLJ-194).
Build it from the repository root, on the machine that will run it or for its
platform (`linux/amd64` or `linux/arm64`):

```sh
docker build -f seeder/Dockerfile -t matko-seeder .
```

Run it with its data in a volume, and add codes in the running container:

```sh
docker run -d --name matko-seeder --restart unless-stopped \
  --network host -v matko-seeder:/data matko-seeder
docker exec matko-seeder node seeder/cli.mjs add <code>
docker exec matko-seeder node seeder/cli.mjs status
docker logs -f matko-seeder
```

`--network host` keeps the seeder off Docker's own NAT, so other computers reach it
as easily as they would the host itself. On Linux that's the host's network. Docker
Desktop (macOS, Windows) runs containers in a VM, where it's the VM's network unless
host networking is turned on in its settings. The seeder runs as an unprivileged
user (`node`) and stops cleanly on `docker stop`.

To run the seeder's end-to-end test against an image instead of the repository's
seeder:

```sh
MATKO_SEEDER_IMAGE=matko-seeder npx vitest run --config vitest.config.e2e.mjs e2e/sharing-seeder.e2e.mjs
```

It needs host networking (above), since the test's apps and the seeder meet on a
local test network.

## As a service (systemd)

Without Docker, on a Linux machine with Node 22: a copy of the repository with only
the runtime dependencies (`npm ci --omit=dev --ignore-scripts`), and a unit like:

```ini
# /etc/systemd/system/matko-seeder.service
[Unit]
Description=Matko seeder
Wants=network-online.target
After=network-online.target

[Service]
User=matko
WorkingDirectory=/opt/matko
Environment=MATKO_SEED_DATA=/var/lib/matko-seed
StateDirectory=matko-seed
ExecStart=/usr/bin/node seeder/cli.mjs run
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then `systemctl enable --now matko-seeder`, and add codes as the same user:
`sudo -u matko MATKO_SEED_DATA=/var/lib/matko-seed node /opt/matko/seeder/cli.mjs add <code>`.

## Not yet

- A published image, built for both platforms in CI (SLJ-194).
- A small web page for adding and watching what it keeps, and an Umbrel app (SLJ-194).
- Pairing with the app, so every Publish adds the course on its own (SLJ-188).
