import { Castle, ChessKing, ChessQueen, Church, Crown, Flag, type LucideIcon, ScrollText, Split, Swords, User } from "lucide-react";

import type { TimelineIcon } from "@/lib/lesson-timeline";

// The icons a timeline point without a picture can have (SLJ-35), shown on
// the lesson's bar and in the editor's choice.
export const TIMELINE_ICON_COMPONENTS: Record<TimelineIcon, LucideIcon> = {
  battle: Swords,
  church: Church,
  document: ScrollText,
  // Three crowns, by rank.
  emperor: ChessKing,
  fortress: Castle,
  king: ChessQueen,
  migration: Split,
  person: User,
  // A knez, a župan, a despot.
  prince: Crown,
  state: Flag,
};
