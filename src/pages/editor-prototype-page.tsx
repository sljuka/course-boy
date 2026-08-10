import { PageContent } from "@/components/page-content";
import { EditorPrototype } from "@/components/editor-prototype/editor-prototype";

export function EditorPrototypePage() {
  return (
    <PageContent>
      <EditorPrototype nodeType="document" />
    </PageContent>
  );
}
