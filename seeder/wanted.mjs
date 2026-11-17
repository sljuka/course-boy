// What the seeder keeps (SLJ-194): every code on the list, and everything a
// kept channel or program lists — its courses, and a channel's programs and
// theirs — including what's added to it later. Worked out again on every
// sync from the list and what the worker last reported, so removing a
// channel from the list also drops what was kept only because of it.
//
// `added`: the codes on the list (kept.json). `kept`: the worker's last
// report (LIST_KEPT_DRIVES), whose programs and channels carry `listed`.
// Returns code -> { via }: `via` is null for a code on the list, else the
// code of the program or channel it's kept for (the first one found).
export function wantedCodes(added, kept) {
  const listedBy = new Map()
  for (const entry of kept ?? []) {
    if (Array.isArray(entry?.listed) && entry.listed.length > 0) listedBy.set(entry.driveKey, entry.listed)
  }

  const wanted = new Map()
  const queue = []
  for (const code of added) {
    if (wanted.has(code)) continue
    wanted.set(code, { via: null })
    queue.push(code)
  }
  // Breadth first from the list only, so a loop (two programs listing each
  // other) never keeps anything alive once neither is wanted.
  while (queue.length > 0) {
    const code = queue.shift()
    for (const listed of listedBy.get(code) ?? []) {
      if (wanted.has(listed)) continue
      wanted.set(listed, { via: code })
      queue.push(listed)
    }
  }
  return wanted
}
