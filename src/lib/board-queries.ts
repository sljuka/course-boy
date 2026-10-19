import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import type { BoardCursor, BoardMessage, BoardModerationChanges, BoardSettings, CourseBoard } from "@/lib/course-board";

// Course boards (SLJ-149). A board changes when messages arrive from other
// devices; the worker says so and its query is read again
// (useRefreshOnBoardChanges, mounted once in App).
const boardKey = (courseId: string) => ["boards", "course", courseId];
const unreadKey = ["boards", "unread"];
const settingsKey = ["boards", "settings"];

export function useCourseBoardQuery(courseId: string | undefined) {
  return useQuery<CourseBoard>({
    enabled: Boolean(courseId),
    queryKey: boardKey(courseId ?? ""),
    queryFn: () => window.boards.get(courseId!),
  });
}

// Unread messages per course, for the course page's tab and Activity.
export function useBoardUnreadQuery() {
  return useQuery<Record<string, number>>({ queryKey: unreadKey, queryFn: () => window.boards.listUnread() });
}

export function useBoardSettingsQuery() {
  return useQuery<BoardSettings>({ queryKey: settingsKey, queryFn: () => window.boards.getSettings() });
}

// Older messages, read only when the student scrolls to them.
export function readOlderBoardMessages(courseId: string, before: BoardCursor): Promise<BoardMessage[]> {
  return window.boards.readOlder(courseId, before);
}

function useInvalidateBoards() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: ["boards"] });
}

export function usePostToBoardMutation(courseId: string) {
  const invalidate = useInvalidateBoards();
  return useMutation<BoardMessage, Error, string>({
    mutationFn: (text) => window.boards.post(courseId, text),
    onSuccess: invalidate,
  });
}

export function useModerateBoardMutation(courseId: string) {
  const invalidate = useInvalidateBoards();
  return useMutation<void, Error, BoardModerationChanges>({
    mutationFn: (changes) => window.boards.moderate(courseId, changes),
    onSuccess: invalidate,
  });
}

// Seen: the board's own count (its tab) and Activity's both go down.
export function useMarkBoardReadMutation() {
  const client = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (courseId) => window.boards.markRead(courseId),
    onSuccess: (_result, courseId) =>
      Promise.all([
        client.invalidateQueries({ queryKey: boardKey(courseId) }),
        client.invalidateQueries({ queryKey: unreadKey }),
      ]),
  });
}

export function useSetBoardShownMutation(courseId: string) {
  const invalidate = useInvalidateBoards();
  return useMutation<void, Error, boolean>({
    mutationFn: (shown) => window.boards.setShown(courseId, shown),
    onSuccess: invalidate,
  });
}

export function useSetBoardSettingsMutation() {
  const invalidate = useInvalidateBoards();
  return useMutation<BoardSettings, Error, Partial<Pick<BoardSettings, "enabled" | "name" | "ownLimitBytes">>>({
    mutationFn: (changes) => window.boards.setSettings(changes),
    onSuccess: invalidate,
  });
}

// A board changed on another device: read it, and the unread counts, again.
export function useRefreshOnBoardChanges() {
  const client = useQueryClient();
  useEffect(
    () =>
      window.boards.onChanged((courseId) => {
        void client.invalidateQueries({ queryKey: boardKey(courseId) });
        void client.invalidateQueries({ queryKey: unreadKey });
      }),
    [client],
  );
}
