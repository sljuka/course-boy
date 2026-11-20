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

A channel or program also keeps every course it lists, and a channel its programs and
theirs, including ones added to it later: a teacher can add their channel's code once
and every course they show on it stays online (SLJ-194). Those aren't on the list
themselves; `status` shows them under what they're kept for, and removing the channel
or program drops them, unless they're on the list on their own too.

### The web page

`run --web <port>` (or `MATKO_SEED_WEB_PORT`) also serves a small page for people who'd
rather not use a terminal: whether it's online and the disk space left, a box to paste a
code or link, what it keeps (with what a channel or program keeps for it, underneath)
and Remove, and what happened recently. In English and Serbian (Latin and Cyrillic).

```sh
node seeder/cli.mjs run --web 8380      # then open http://127.0.0.1:8380/
```

It listens on `127.0.0.1` unless `MATKO_SEED_WEB_HOST` says otherwise (`0.0.0.0` for
every network). Anywhere but this computer it won't start without
`MATKO_SEED_WEB_PASSWORD` (asked by the browser, any user name), unless
`MATKO_SEED_WEB_OPEN=1` says something in front of it already checks who's there (a
reverse proxy with its own login). It never shows a course's content, and can't publish.

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

### Disk space

An always-on box runs other things too, so the seeder doesn't fill its disk (SLJ-194). A
new code starts being kept only while there's space:

- `MATKO_SEED_MIN_FREE`: free disk space it always leaves (default `1GB`).
- `MATKO_SEED_MAX_SIZE`: a cap on its own store, e.g. `40GB` (no cap unless set).

Sizes are binary (1 GB = 1024 MB), like the page shows them. When either limit is
reached, a new code waits ("waiting for space" in `status` and on the page) and starts
once something is removed or the disk has room again. What's already kept stays online
and still gets its new versions: stopping them would leave students on an old version.
The page shows how much the seeder uses, and warns before it's full (under twice the
free-space floor left, or 90% of the cap used).

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

With the web page, on port 8380 of every network the host is on, behind a password:

```sh
docker run -d --name matko-seeder --restart unless-stopped \
  --network host -v matko-seeder:/data \
  -e MATKO_SEED_WEB_PORT=8380 -e MATKO_SEED_WEB_HOST=0.0.0.0 \
  -e MATKO_SEED_WEB_PASSWORD='choose one' matko-seeder
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

- The image is built for both platforms in CI and pushed to GHCR at a release, and the
  Umbrel app is ready in `seeder/umbrel/`; the store repository itself is made and
  pushed by hand (seeder/umbrel/README.md). Checked on a real Umbrel by hand: students
  import from it alone, and it fetches a new version, on the host's network (the app
  uses it; on Docker's bridge network it couldn't reach a teacher on the same home
  network). Still to confirm there: that it keeps a course across a reboot (SLJ-194).
- Pairing with the app, so every Publish adds the course on its own (SLJ-188).
