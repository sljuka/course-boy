#!/usr/bin/env bash
# Points the Umbrel app at a released seeder image (SLJ-194): sets the
# version in umbrel-app.yml and the image, pinned by its multi-arch digest as
# Umbrel requires, in docker-compose.yml.
#
#   seeder/umbrel/pin-image.sh 0.3.0
#
# Needs `docker buildx` and the image already on GHCR (a release pushes it).
set -euo pipefail
version="${1:?usage: pin-image.sh <version, e.g. 0.3.0>}"
dir="$(cd "$(dirname "$0")/matko-seeder" && pwd)"
image="ghcr.io/sljuka/matko-seeder:${version}"
digest="$(docker buildx imagetools inspect "$image" --format '{{json .Manifest}}' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).digest))')"
platforms="$(docker buildx imagetools inspect "$image" | grep -c 'Platform:.*linux/\(amd64\|arm64\)' || true)"
if [ "$platforms" -lt 2 ]; then
  echo "$image doesn't have both linux/amd64 and linux/arm64" >&2
  exit 1
fi
sed -i.bak -E "s#^version: \".*\"#version: \"${version}\"#" "$dir/umbrel-app.yml"
sed -i.bak -E "s#image: ghcr.io/sljuka/matko-seeder:.*#image: ${image}@${digest}#" "$dir/docker-compose.yml"
rm -f "$dir"/*.bak
echo "Pinned ${image}@${digest}"
