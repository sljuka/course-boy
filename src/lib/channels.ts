// Channels (SLJ-31), as the renderer sees them. A channel is stored and
// shared as a program marked `kind: "channel"` (src/lib/program-package.ts);
// main keeps the profile's own (electron/channels.ts).

// A course's channel. For an imported course: the code its source.json
// names; once the channel is here (followed), its program id and title, and
// whether it lists this course (`verified`: only then is "by <channel>" a
// fact rather than the course's claim). For your own: your channel, and
// whether the course is shown on it (`listed`).
export type ChannelForCourse = {
  code: string | null;
  // Your own course only: shown on your channel. Null for an imported one.
  listed: boolean | null;
  programId: string | null;
  title: string | null;
  verified: boolean;
};
