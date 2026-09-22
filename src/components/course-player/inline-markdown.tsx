import { Fragment } from "react";

export const InlineMarkdown = ({ source }: { source: string }) => {
  const parts = source.split(/(\*\*.*?\*\*)/g).filter(Boolean);

  return (
    <span>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            // Bolder (700) than the font-medium (500) surrounding prompt
            // text — otherwise an interpolated template value would blend
            // in or look lighter than the sentence around it instead of
            // standing out.
            <strong
              key={`${part}-${index}`}
              className="font-bold text-foreground"
            >
              {part.slice(2, -2)}
            </strong>
          );
        }

        return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
      })}
    </span>
  );
};
