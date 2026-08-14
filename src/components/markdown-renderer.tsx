import Markdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const markdownComponents: Components = {
  a: ({ node: _node, ...props }) => (
    <a
      {...props}
      className="text-stone-900 underline decoration-stone-300 underline-offset-4"
    />
  ),
  blockquote: ({ node: _node, ...props }) => (
    <blockquote {...props} className="border-l-2 border-stone-300 pl-4 italic text-stone-700" />
  ),
  code: ({ className, children, ...props }) => {
    const isInlineCode = !className;

    if (isInlineCode) {
      return (
        <code
          {...props}
          className="rounded-sm bg-stone-100 px-1.5 py-0.5 font-mono text-[0.95em] text-stone-900"
        >
          {children}
        </code>
      );
    }

    return (
      <code
        {...props}
        className="block overflow-x-auto rounded-xl bg-stone-950 p-4 font-mono text-sm text-stone-100"
      >
        {children}
      </code>
    );
  },
  h1: ({ node: _node, ...props }) => (
    <h1
      {...props}
      className="text-3xl font-semibold tracking-tight leading-tight text-stone-950"
    />
  ),
  h2: ({ node: _node, ...props }) => (
    <h2
      {...props}
      className="text-2xl font-semibold tracking-tight leading-tight text-stone-950"
    />
  ),
  h3: ({ node: _node, ...props }) => (
    <h3 {...props} className="text-xl font-semibold leading-snug text-stone-950" />
  ),
  ol: ({ node: _node, ...props }) => (
    <ol {...props} className="list-decimal space-y-2 pl-5 leading-8 text-stone-700" />
  ),
  p: ({ node: _node, ...props }) => (
    <p {...props} className="text-base leading-8 text-stone-700" />
  ),
  pre: ({ node: _node, ...props }) => <pre {...props} className="m-0 bg-transparent p-0" />,
  ul: ({ node: _node, ...props }) => (
    <ul {...props} className="list-disc space-y-2 pl-5 leading-8 text-stone-700" />
  ),
};

export function MarkdownRenderer({ source }: { source: string }) {
  return (
    <div className="prose prose-stone max-w-none">
      <Markdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
        {source}
      </Markdown>
    </div>
  );
}
