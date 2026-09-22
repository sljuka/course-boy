import Markdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const markdownComponents: Components = {
  a: ({ node: _node, ...props }) => (
    <a
      {...props}
      className="text-foreground underline decoration-border underline-offset-4"
    />
  ),
  blockquote: ({ node: _node, ...props }) => (
    <blockquote {...props} className="border-l-2 border-border pl-4 italic text-foreground" />
  ),
  code: ({ className, children, ...props }) => {
    const isInlineCode = !className;

    if (isInlineCode) {
      return (
        <code
          {...props}
          className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[0.95em] text-foreground"
        >
          {children}
        </code>
      );
    }

    return (
      <code
        {...props}
        // eslint-disable-next-line shadcn/no-raw-colors -- fenced code blocks stay dark regardless of page theme, the common convention for syntax-highlighted code
        className="block overflow-x-auto rounded-xl bg-stone-950 p-4 font-mono text-sm text-stone-100"
      >
        {children}
      </code>
    );
  },
  h1: ({ node: _node, ...props }) => (
    <h1
      {...props}
      className="text-3xl font-semibold tracking-tight leading-tight text-foreground"
    />
  ),
  h2: ({ node: _node, ...props }) => (
    <h2
      {...props}
      className="text-2xl font-semibold tracking-tight leading-tight text-foreground"
    />
  ),
  h3: ({ node: _node, ...props }) => (
    <h3 {...props} className="text-xl font-semibold leading-snug text-foreground" />
  ),
  ol: ({ node: _node, ...props }) => (
    <ol {...props} className="list-decimal space-y-2 pl-5 leading-8 text-foreground" />
  ),
  p: ({ node: _node, ...props }) => (
    <p {...props} className="text-base leading-8 text-foreground" />
  ),
  pre: ({ node: _node, ...props }) => <pre {...props} className="m-0 bg-transparent p-0" />,
  ul: ({ node: _node, ...props }) => (
    <ul {...props} className="list-disc space-y-2 pl-5 leading-8 text-foreground" />
  ),
};

export function MarkdownRenderer({ source }: { source: string }) {
  return (
    <div>
      <Markdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
        {source}
      </Markdown>
    </div>
  );
}
