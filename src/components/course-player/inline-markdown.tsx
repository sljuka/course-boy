import { Fragment, useContext, useMemo } from "react";

import { MnemonicInline } from "@/components/course-player/mnemonic-inline";
import { createMnemonicMatcher, type MnemonicSegment } from "@/lib/mnemonics";
import { PromptMnemonicsContext } from "@/lib/prompt-mnemonics-context";

export const InlineMarkdown = ({ source }: { source: string }) => {
  const mnemonics = useContext(PromptMnemonicsContext);
  const parts = useMemo(() => {
    const matcher = createMnemonicMatcher(mnemonics);

    return source
      .split(/(\*\*.*?\*\*)/g)
      .filter(Boolean)
      .map((part) =>
        part.startsWith("**") && part.endsWith("**")
          ? { bold: true, segments: matcher.split(part.slice(2, -2)) }
          : { bold: false, segments: matcher.split(part) },
      );
  }, [mnemonics, source]);

  const renderSegments = (segments: MnemonicSegment[]) =>
    segments.map((segment, index) =>
      "mnemonic" in segment ? (
        <MnemonicInline key={index} mnemonic={segment.mnemonic}>
          {segment.text}
        </MnemonicInline>
      ) : (
        <Fragment key={index}>{segment.text}</Fragment>
      ),
    );

  return (
    <span>
      {parts.map((part, index) => {
        if (part.bold) {
          return (
            // Bolder (700) than the font-medium (500) surrounding prompt
            // text — otherwise an interpolated template value would blend
            // in or look lighter than the sentence around it instead of
            // standing out.
            <strong key={index} className="font-bold text-foreground">
              {renderSegments(part.segments)}
            </strong>
          );
        }

        return <Fragment key={index}>{renderSegments(part.segments)}</Fragment>;
      })}
    </span>
  );
};
