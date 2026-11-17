# The Matko seeder (SLJ-144, SLJ-194): keeps courses online without the app.
# Build from the repository root:
#
#   docker build -f seeder/Dockerfile -t matko-seeder .
#
# Multi-arch (linux/amd64, linux/arm64) in CI with buildx. Each architecture
# installs its own runtime dependencies, so the Bare runtime's binary always
# matches the image's platform (never copied across).

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Runtime dependencies only: the worker's imports and bare-runtime (see
# "dependencies" in package.json). --ignore-scripts: the root `prepare`
# script installs git hooks with a dev dependency, which isn't here.
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force \
 # The Bare runtime's binary must be executable; bare-runtime would otherwise
 # try to chmod it at start, which the unprivileged user can't do.
 && chmod 755 node_modules/bare-runtime-*/bin/bare \
 # Native modules ship prebuilt binaries for every platform (Android, iOS,
 # macOS, Windows…); keep only this image's own (about 250 MB less).
 && host="$(node -p 'process.platform + "-" + process.arch')" \
 && find node_modules -type d -path '*/prebuilds/*' -prune ! -name "$host*" -exec rm -rf {} +

FROM node:22-bookworm-slim
LABEL org.opencontainers.image.title="Matko seeder" \
      org.opencontainers.image.description="Keeps Matko courses online while their teacher's computer is off" \
      org.opencontainers.image.licenses="AGPL-3.0-or-later" \
      org.opencontainers.image.source="https://github.com/sljuka/course-boy"
ENV NODE_ENV=production \
    MATKO_SEED_DATA=/data
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY workers ./workers
COPY seeder ./seeder
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
# The web page's usual port, when MATKO_SEED_WEB_PORT asks for it (off unless set).
EXPOSE 8380
ENTRYPOINT ["node", "seeder/cli.mjs"]
CMD ["run"]
