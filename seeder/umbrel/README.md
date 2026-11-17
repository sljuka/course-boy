# The seeder on Umbrel (SLJ-194)

An Umbrel community app store with one app, the Matko seeder. umbrelOS runs it behind
its own login (the app proxy), with its data in the app's data folder, and opens its web
page from the dashboard.

```
umbrel-app-store.yml          the store: id "matko", so every app id starts with "matko-"
matko-seeder/
  umbrel-app.yml              the listing (name, description, version, port 8380)
  docker-compose.yml          the seeder, its page on 8380 behind Umbrel's app proxy
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

- The page needs no password of its own (`MATKO_SEED_WEB_OPEN=1`): Umbrel's login is in
  front of it. It still listens only inside the app's network.
- It runs on Umbrel's bridge network, not the host's, so the app proxy (and its login)
  works. Peer-to-peer connections then pass one more NAT; Hyperswarm punches through
  that, but it's still to be confirmed on a real box that students can reach it.
- `category: networking` follows other networking apps; check it against the store's
  current categories before submitting to the official store. Official submissions also
  drop `icon` and `submitter`/`submission` point at the pull request.
