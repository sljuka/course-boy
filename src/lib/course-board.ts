// Course boards (SLJ-149): what the window and main exchange about a course's
// board. The messages themselves travel between devices in the worker
// (workers/board-sync.cjs); main decides which boards are open
// (electron/course-boards.ts).

// A message as the worker has it: `author` is the sender's key in hex (what
// blocking names), `authorId` the same key as the app shows keys (z32).
export type BoardWorkerMessage = {
  author: string;
  authorId: string;
  date: number;
  id: string;
  name: string;
  text: string;
};

export type BoardModeration = {
  blocked: string[];
  hidden: string[];
  on: boolean;
  seq: number;
  studentLimitBytes: number;
};

// One page of a board from the worker, or `closed` when it isn't open there.
export type BoardWorkerPage =
  | {
      isTeacher: boolean;
      messages: BoardWorkerMessage[];
      moderation: BoardModeration | null;
      peers: number;
      self: string;
      selfId: string;
      // The course's own key (hex): its messages are the teacher's.
      teacherKey: string;
    }
  | { closed: true };

// Where a page of messages ends, to ask for the next (older) one.
export type BoardCursor = { date: number; id: string };

// A message as the window shows it. `name` is what the sender typed (empty
// for none: the window shows a name generated from `author`); `tag` is the
// start of their key, so two people with the same name can be told apart.
export type BoardMessage = {
  author: string;
  date: number;
  id: string;
  isMine: boolean;
  isTeacher: boolean;
  name: string;
  tag: string;
  text: string;
};

// A course's board on this device:
// - unavailable: the course has no board here (never shared, or shared by
//   several maintainers, which boards don't support yet);
// - hidden: the student switched it off, for this course or for all;
// - off: the teacher hasn't turned it on (the teacher's own device can);
// - on: messages, newest first.
export type CourseBoard =
  | { status: "unavailable" }
  | { status: "hidden" }
  | { isTeacher: boolean; status: "off" }
  | {
      isTeacher: boolean;
      messages: BoardMessage[];
      peers: number;
      // Who this device posts as: its key in hex (for the generated name),
      // its tag, and on the teacher's device the channel's name (null: the
      // board name from Settings).
      self: { author: string; name: string | null; tag: string };
      status: "on";
      studentLimitBytes: number;
      unread: number;
    };

export type BoardModerationChanges = {
  block?: string[];
  hide?: string[];
  on?: boolean;
  studentLimitBytes?: number;
  unblock?: string[];
  unhide?: string[];
};

// This profile's board settings. `name`: the board name others see on every
// course's board (empty: a generated one per course; never the profile
// name). `enabled`: boards at all on this device. `ownLimitBytes`: what the
// teacher's device keeps per board.
export type BoardSettings = {
  enabled: boolean;
  hiddenCourses: string[];
  name: string;
  ownLimitBytes: number;
};

export const DEFAULT_STUDENT_LIMIT_BYTES = 10 * 1024 * 1024;
export const DEFAULT_TEACHER_LIMIT_BYTES = 100 * 1024 * 1024;
// The bounds the worker accepts for the students' limit
// (workers/board-messages.cjs).
export const MIN_STUDENT_LIMIT_BYTES = 256 * 1024;
export const MAX_STUDENT_LIMIT_BYTES = 100 * 1024 * 1024;
export const MAX_BOARD_TEXT_LENGTH = 256;
export const MAX_BOARD_NAME_LENGTH = 40;

export type CourseBoardOn = Extract<CourseBoard, { status: "on" }>;

// The board while it's on, else null.
export function boardIfOn(board: CourseBoard | undefined): CourseBoardOn | null {
  return board?.status === "on" ? board : null;
}
