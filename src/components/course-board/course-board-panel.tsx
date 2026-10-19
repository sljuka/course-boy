import { useEffect, useState } from "react";
import { EyeOff, MoreHorizontal, Undo2, UserX } from "lucide-react";
import { useTranslation } from "react-i18next";

import { BoardComposer } from "@/components/course-board/board-composer";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  BoardMessage,
  BoardMessageAuthor,
  BoardMessageHeader,
  BoardMessageTag,
  BoardMessageText,
  BoardMessageTime,
} from "@/components/ui/board-message";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { boardDisplayName } from "@/lib/board-names";
import { readOlderBoardMessages, useMarkBoardReadMutation, useModerateBoardMutation } from "@/lib/board-queries";
import type { BoardMessage as BoardMessageData, BoardModerationChanges, CourseBoard } from "@/lib/course-board";
import type { Locale } from "@/lib/i18n";
import { useAppState } from "@/lib/use-app-state";

// A full first page means there may be older ones (the worker reads 50).
const PAGE_SIZE = 50;

type Undoable = { changes: BoardModerationChanges; kind: "hidden" | "blocked" };

function formatMessageDate(date: number, locale: Locale): string {
  const value = new Date(date);
  const isToday = value.toDateString() === new Date().toDateString();
  return new Intl.DateTimeFormat(locale, isToday ? { timeStyle: "short" } : { dateStyle: "medium", timeStyle: "short" }).format(
    value,
  );
}

// A course's board (SLJ-149): a box to post in, then messages newest first.
// Older ones than this device keeps are asked from connected devices on
// "Show older", and only shown. The teacher hides a message or blocks its
// sender from its menu, with Undo right after.
export function CourseBoardPanel({ board, courseId }: { board: Extract<CourseBoard, { status: "on" }>; courseId: string }) {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const moderate = useModerateBoardMutation(courseId);
  const markRead = useMarkBoardReadMutation();
  const [older, setOlder] = useState<BoardMessageData[]>([]);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasNoOlder, setHasNoOlder] = useState(false);
  const [undoable, setUndoable] = useState<Undoable | null>(null);

  const newestId = board.messages[0]?.id;
  const markReadMutate = markRead.mutate;
  // Seen while the board is open.
  useEffect(() => {
    if (newestId) markReadMutate(courseId);
  }, [courseId, markReadMutate, newestId]);

  const shownIds = new Set(board.messages.map((message) => message.id));
  const messages = [...board.messages, ...older.filter((message) => !shownIds.has(message.id))];
  const last = messages.at(-1);
  const mayHaveOlder = !hasNoOlder && Boolean(last) && (board.messages.length >= PAGE_SIZE || older.length > 0 || board.peers > 0);

  async function showOlder() {
    if (!last) return;
    setIsLoadingOlder(true);
    try {
      const page = await readOlderBoardMessages(courseId, { date: last.date, id: last.id });
      if (page.length === 0) setHasNoOlder(true);
      setOlder((current) => [...current, ...page]);
    } finally {
      setIsLoadingOlder(false);
    }
  }

  function apply(changes: BoardModerationChanges, undo: Undoable) {
    moderate.mutate(changes, { onSuccess: () => setUndoable(undo) });
  }

  function hide(message: BoardMessageData) {
    setOlder((current) => current.filter((entry) => entry.id !== message.id));
    apply({ hide: [message.id] }, { changes: { unhide: [message.id] }, kind: "hidden" });
  }

  function block(message: BoardMessageData) {
    setOlder((current) => current.filter((entry) => entry.author !== message.author));
    apply({ block: [message.author] }, { changes: { unblock: [message.author] }, kind: "blocked" });
  }

  return (
    <div className="flex flex-col gap-4" data-testid="course-board">
      <BoardComposer courseId={courseId} self={board.self} />

      {undoable && (
        <Alert data-testid="board-undo" variant="info">
          <AlertDescription>{t(`board.moderation.${undoable.kind}`)}</AlertDescription>
          <AlertAction>
            <Button
              data-testid="board-undo-button"
              onClick={() => moderate.mutate(undoable.changes, { onSuccess: () => setUndoable(null) })}
              size="sm"
              variant="ghost"
            >
              <Undo2 aria-hidden="true" />
              {t("board.moderation.undo")}
            </Button>
          </AlertAction>
        </Alert>
      )}

      {messages.length === 0 ? (
        <CardDescription data-testid="board-empty">{t("board.empty")}</CardDescription>
      ) : (
        <div className="flex flex-col">
          {messages.map((message) => (
            <BoardMessage data-testid="board-message" key={message.id}>
              <BoardMessageHeader>
                <BoardMessageAuthor>{boardDisplayName(message, locale)}</BoardMessageAuthor>
                <BoardMessageTag>{message.tag}</BoardMessageTag>
                {message.isTeacher && <Badge variant="secondary">{t("board.teacherBadge")}</Badge>}
                <BoardMessageTime dateTime={new Date(message.date).toISOString()}>
                  {formatMessageDate(message.date, locale)}
                </BoardMessageTime>
                {board.isTeacher && !message.isMine && (
                  <div className="ml-auto">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            aria-label={t("board.moderation.menu")}
                            data-testid="board-message-menu"
                            size="icon-xs"
                            variant="ghost"
                          />
                        }
                      >
                        <MoreHorizontal aria-hidden="true" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-48">
                        <DropdownMenuItem data-testid="board-hide" onClick={() => hide(message)}>
                          <EyeOff aria-hidden="true" />
                          {t("board.moderation.hide")}
                        </DropdownMenuItem>
                        {!message.isTeacher && (
                          <DropdownMenuItem data-testid="board-block" onClick={() => block(message)} variant="destructive">
                            <UserX aria-hidden="true" />
                            {t("board.moderation.block")}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </BoardMessageHeader>
              <BoardMessageText>{message.text}</BoardMessageText>
            </BoardMessage>
          ))}
        </div>
      )}

      {mayHaveOlder && (
        <Button data-testid="board-show-older" disabled={isLoadingOlder} onClick={() => void showOlder()} size="sm" variant="ghost">
          {isLoadingOlder && <Spinner aria-hidden="true" />}
          {t("board.showOlder")}
        </Button>
      )}
    </div>
  );
}
