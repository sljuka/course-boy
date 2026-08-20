import type { EditorPrototypeBlock } from "@/components/editor-prototype/editor-prototype-types";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { matkoAssetUrl } from "@/lib/course-assets";
import { markdownToBlocks } from "@/lib/lesson-content-markdown";

export function LessonBlocks({ courseId, source }: { courseId: string; source: string }) {
  const blocks = markdownToBlocks(source);

  return (
    <div className="typeset typeset-course">
      {blocks.map((block) => (
        <LessonBlock block={block} courseId={courseId} key={block.id} />
      ))}
    </div>
  );
}

function LessonBlock({
  block,
  courseId,
}: {
  block: EditorPrototypeBlock;
  courseId: string;
}) {
  switch (block.type) {
    case "heading":
      return <MarkdownRenderer source={`## ${block.text}`} />;
    case "markdown":
      return <MarkdownRenderer source={block.source} />;
    case "image":
      return (
        <figure>
          <img
            alt={block.alt}
            className="max-w-full"
            src={matkoAssetUrl(courseId, block.path)}
          />
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      );
    case "video":
      return (
        <figure>
          <video className="max-w-full" controls src={matkoAssetUrl(courseId, block.path)} />
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      );
    case "audio":
      return (
        <figure>
          <audio className="max-w-full" controls src={matkoAssetUrl(courseId, block.path)} />
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      );
  }
}
