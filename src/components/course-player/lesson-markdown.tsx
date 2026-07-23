import { InlineMarkdown } from "@/components/course-player/inline-markdown";

export const LessonMarkdown = ({ source }: { source: string }) => {
  const blocks = source
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="typeset typeset-course">
      {blocks.map((block, index) => {
        const lines = block.split("\n");
        const firstLine = lines[0]?.trim() ?? "";
        const rest = lines.slice(1).join(" ").trim();

        if (firstLine.startsWith("# ")) {
          return (
            <section key={`${firstLine}-${index}`}>
              <h3>{firstLine.replace(/^#\s+/, "")}</h3>
              {rest && (
                <p>
                  <InlineMarkdown source={rest} />
                </p>
              )}
            </section>
          );
        }

        return (
          <p key={`${block}-${index}`}>
            <InlineMarkdown source={lines.join(" ")} />
          </p>
        );
      })}
    </div>
  );
};
