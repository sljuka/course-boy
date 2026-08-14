import { MarkdownRenderer } from "@/components/markdown-renderer";

export const LessonMarkdown = ({ source }: { source: string }) => {
  return (
    <div className="typeset typeset-course">
      <MarkdownRenderer source={source} />
    </div>
  );
};
