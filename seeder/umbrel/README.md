# The seeder on Umbrel (SLJ-194)

An Umbrel community app store with one app, the Matko seeder. umbrelOS runs it on the
host's network, with its data in the app's data folder, and opens its web page from the
dashboard; the page asks for the password Umbrel shows in the app's details.

```
umbrel-app-store.yml          the store: id "matko", so every app id starts with "matko-"
matko-seeder/
  umbrel-app.yml              the listing (name, description, version, port 8380)
  docker-compose.yml          the seeder on the host's network, its page on 8380
  data/seeder/.gitkeep        its data folder, mounted at /data
pin-image.sh                  points the app at a released image, pinned by digest
```

## Publishing a version of the app

1. A release pushes the image to GHCR (`ghcr.io/sljuka/matko-seeder:<version>`, amd64
   and arm64; the `seeder-image` jobs in `.github/workflows/release.yml`). The first time,
   make the package public on GitHub (Packages → matko-seeder → Package settings →
   Change visibility), since Umbrel pulls it without credentials.
2. `seeder/umbrel/pin-image.sh <version>` sets the version and pins the image by its
   multi-arch digest, as Umbrel requires.
3. Copy `umbrel-app-store.yml` and `matko-seeder/` to the root of the store repository (a
   public GitHub repository made from Umbrel's template,
   https://github.com/getumbrel/umbrel-community-app-store) and push.

## Installing it

In umbrelOS, add the store repository's GitHub URL as a community app store (in the App
Store; Umbrel's docs show it in a video rather than naming the menu, so it may move
between versions), then install "Matko seeder" from it.

## Choices, and what to check on a real Umbrel

- It runs on the host's network (`network_mode: host`). On Umbrel's bridge network,
  students elsewhere reached it, but a teacher's app on the same home network couldn't
  be reached from it, so new versions didn't arrive (checked on a real Umbrel, SLJ-194).
  The teacher's app now also looks for the seeders keeping its courses, which helps
  there too, but the host's network doesn't depend on it.
- Umbrel's app proxy, and with it Umbrel's login, can't front a host-network app
  (Umbrel's packaging guide), so the page has a password of its own: Umbrel's
  per-install `APP_PASSWORD` (`deterministicPassword: true`), which Umbrel shows the
  owner. Any user name works; the listing suggests "matko". Port 8380 must be free on
  the box.
- `category: networking` follows other networking apps; check it against the store's
  current categories before submitting to the official store. Official submissions also
  drop `icon` and `submitter`/`submission` point at the pull request.
