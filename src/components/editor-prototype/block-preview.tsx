import { MarkdownRenderer } from "@/components/markdown-renderer";
import { CardDescription } from "@/components/ui/card";
import type {
  DiagramBlock,
  ImageBlock,
  MarkdownBlock,
  VideoBlock,
} from "@/components/editor-prototype/editor-prototype-types";

export function MarkdownBlockPreview({ block }: { block: MarkdownBlock }) {
  if (!block.source.trim()) {
    return (
      <div className="text-base leading-7 text-stone-400">
        Preview appears here while the learner-facing output takes shape.
      </div>
    );
  }

  return (
    <MarkdownRenderer source={block.source} />
  );
}

export function DiagramBlockPreview({
  block,
  previewSource,
}: {
  block: DiagramBlock;
  previewSource: string;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
          Mermaid Preview
        </div>
        <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-sm leading-6 text-sky-950">
          {previewSource || block.source}
        </pre>
      </div>
      <CardDescription>
        Debounced render placeholder. Replace this with Mermaid runtime once the
        block model feels right.
      </CardDescription>
    </div>
  );
}

export function ImageBlockPreview({ block }: { block: ImageBlock }) {
  if (!block.src.trim()) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-500">
        Image preview appears after adding a source URL or local asset path.
      </div>
    );
  }

  return (
    <figure className="space-y-3">
      <img
        alt={block.alt || "Prototype image block"}
        className="max-h-80 w-full rounded-2xl border border-stone-200 object-cover"
        src={block.src}
      />
      {block.caption ? <CardDescription>{block.caption}</CardDescription> : null}
    </figure>
  );
}

function resolveYouTubeEmbedUrl(source: string): string | null {
  try {
    const url = new URL(source);

    if (url.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${url.pathname.slice(1)}`;
    }

    if (url.hostname.includes("youtube.com")) {
      const videoId = url.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    return null;
  } catch {
    return null;
  }
}

export function VideoBlockPreview({ block }: { block: VideoBlock }) {
  const embedUrl = resolveYouTubeEmbedUrl(block.src);

  if (embedUrl) {
    return (
      <figure className="space-y-3">
        <div className="aspect-video overflow-hidden rounded-2xl border border-stone-200 bg-stone-950">
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
            src={embedUrl}
            title="Video block preview"
          />
        </div>
        {block.caption ? <CardDescription>{block.caption}</CardDescription> : null}
      </figure>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4">
      <div className="text-sm text-stone-700">
        Video preview prototype. Paste a YouTube URL to see an inline embed.
      </div>
      {block.src ? (
        <code className="text-xs text-stone-500">{block.src}</code>
      ) : null}
      {block.caption ? <CardDescription>{block.caption}</CardDescription> : null}
    </div>
  );
}
