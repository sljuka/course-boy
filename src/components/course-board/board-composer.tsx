import { useState } from "react";
import { Send } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { boardDisplayName } from "@/lib/board-names";
import { useBoardSettingsQuery, usePostToBoardMutation } from "@/lib/board-queries";
import { MAX_BOARD_TEXT_LENGTH } from "@/lib/course-board";
import { useAppState } from "@/lib/use-app-state";

const segmenter = new Intl.Segmenter();

// Characters as people see them ("👍🏽" is one), as the worker counts them.
function countCharacters(text: string): number {
  return [...segmenter.segment(text)].length;
}

// Why the worker didn't take a message, as the window says it. The reason
// travels as the end of the error's message (IPC keeps only the message).
function postErrorKey(error: Error): string {
  const message = error.message;
  if (message.includes("rate-limited")) return "board.errors.rateLimited";
  if (message.includes("blocked")) return "board.errors.blocked";
  if (message.includes("too-long")) return "board.errors.tooLong";
  if (message.includes("board is off")) return "board.errors.off";
  return "board.errors.generic";
}

// Posting on a course's board, under the board name from Settings (or the
// one generated for this course; the teacher, their channel's name), with the
// tag others see next to it.
export function BoardComposer({
  courseId,
  self,
}: {
  courseId: string;
  self: { author: string; name: string | null; tag: string };
}) {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const { data: settings } = useBoardSettingsQuery();
  const post = usePostToBoardMutation(courseId);
  const [text, setText] = useState("");
  const length = countCharacters(text);
  const isTooLong = length > MAX_BOARD_TEXT_LENGTH;
  const canPost = text.trim() !== "" && !isTooLong && !post.isPending;
  const name = boardDisplayName({ author: self.author, name: self.name ?? settings?.name ?? "" }, locale);

  function submit() {
    if (!canPost) return;
    post.mutate(text, { onSuccess: () => setText("") });
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        aria-invalid={isTooLong}
        aria-label={t("board.composer.label")}
        data-testid="board-composer"
        onChange={(event) => {
          setText(event.target.value);
          post.reset();
        }}
        onKeyDown={(event) => {
          // ⌘/Ctrl+Enter posts; Enter alone is a new line.
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            submit();
          }
        }}
        placeholder={t("board.composer.placeholder")}
        value={text}
      />
      {post.isError && <FieldError data-testid="board-post-error">{t(postErrorKey(post.error))}</FieldError>}
      <div className="flex items-center gap-3">
        <CardDescription className="min-w-0 flex-1 truncate" data-testid="board-posting-as">
          {t("board.composer.postingAs", { name, tag: self.tag })}
        </CardDescription>
        <CardDescription className="tabular-nums">
          {t("board.composer.count", { length, max: MAX_BOARD_TEXT_LENGTH })}
        </CardDescription>
        <Button data-testid="board-post" disabled={!canPost} onClick={submit} size="sm">
          <Send aria-hidden="true" />
          {t("board.composer.post")}
        </Button>
      </div>
    </div>
  );
}
