import { Fragment } from "react";

export const InlineMarkdown = ({ source }: { source: string }) => {
  const parts = source.split(/(\*\*.*?\*\*)/g).filter(Boolean);

  return (
    <span>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong
              key={`${part}-${index}`}
              className="font-medium text-foreground"
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
