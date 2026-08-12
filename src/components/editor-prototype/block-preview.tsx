import { Fragment } from "react";

import { CardDescription } from "@/components/ui/card";
import type {
  DiagramBlock,
  ImageBlock,
  MarkdownBlock,
  VideoBlock,
} from "@/components/editor-prototype/editor-prototype-types";

function renderInlinePrototypeMarkdown(source: string) {
  const parts = source.split(/(\$\$.*?\$\$|\$.*?\$|\*\*.*?\*\*)/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold text-stone-950">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("$$") && part.endsWith("$$")) {
      return (
        <code
          key={`${part}-${index}`}
          className="rounded-md bg-amber-50 px-2 py-1 font-mono text-amber-950"
        >
          {part.slice(2, -2)}
        </code>
      );
    }

    if (part.startsWith("$") && part.endsWith("$")) {
      return (
        <code
          key={`${part}-${index}`}
          className="rounded-sm bg-stone-100 px-1.5 py-0.5 font-mono text-stone-900"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
  });
}

export function MarkdownBlockPreview({ block }: { block: MarkdownBlock }) {
  if (!block.source.trim()) {
    return (
      <div className="text-base leading-7 text-stone-400">
        Preview appears here while the learner-facing output takes shape.
      </div>
    );
  }

  const lines = block.source.split("\n");

  return (
    <div className="space-y-2.5">
      {lines.map((line, index) => {
        const trimmedLine = line.trim();

        if (!trimmedLine) {
          return <div className="h-2" key={`${line}-${index}`} />;
        }

        if (trimmedLine.startsWith("### ")) {
          return (
            <h3 className="text-xl font-semibold text-stone-950" key={`${line}-${index}`}>
              {renderInlinePrototypeMarkdown(trimmedLine.slice(4))}
            </h3>
          );
        }

        if (trimmedLine.startsWith("## ")) {
          return (
            <h2 className="text-2xl font-semibold text-stone-950" key={`${line}-${index}`}>
              {renderInlinePrototypeMarkdown(trimmedLine.slice(3))}
            </h2>
          );
        }

        if (trimmedLine.startsWith("# ")) {
          return (
            <h1 className="text-3xl font-semibold text-stone-950" key={`${line}-${index}`}>
              {renderInlinePrototypeMarkdown(trimmedLine.slice(2))}
            </h1>
          );
        }

        return (
          <p className="text-base leading-6 text-stone-700" key={`${line}-${index}`}>
            {renderInlinePrototypeMarkdown(trimmedLine)}
          </p>
        );
      })}
    </div>
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
