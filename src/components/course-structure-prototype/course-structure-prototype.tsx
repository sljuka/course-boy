import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  FilePlus2,
  FileText,
  FlaskConical,
  Folder,
  FolderPlus,
  PanelRightOpen,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  courseRootId,
  type StructureSelection,
} from "@/components/course-structure-prototype/course-structure-prototype-types";
import type { CourseSectionPreview } from "@/lib/course-package";
import { resolveTestIdForLesson } from "@/lib/course-test-id";
import {
  useCreateCourseLessonMutation,
  useCreateCourseSectionMutation,
  useCreateCourseSectionTestMutation,
} from "@/lib/course-queries";

type DocumentNode = {
  hasTest: boolean;
  id: string;
  title: string;
  type: "document";
};

// A standalone test — a section child in its own right, independent of any
// document. Distinct from the "Test" row nested under a DocumentNode above,
// which represents a lesson-attached test instead.
type TestNode = {
  id: string;
  title: string;
  type: "test";
};

type SectionNode = {
  children: Array<DocumentNode | TestNode>;
  id: string;
  title: string;
  type: "section";
};

type PendingCreate =
  | { type: "section" }
  | { sectionId: string; type: "document" }
  | { sectionId: string; type: "test" };

const courseRootTitle = "Course";

export function CourseStructurePrototype({
  compact = false,
  courseId,
  courseTitle = courseRootTitle,
  onSelectionChange,
  sections,
  selectedNodeId = courseRootId,
  showFrameHeader = true,
}: {
  compact?: boolean;
  courseId: string;
  courseTitle?: string;
  onSelectionChange?: (selection: StructureSelection) => void;
  sections: CourseSectionPreview[];
  selectedNodeId?: string;
  showFrameHeader?: boolean;
}) {
  const [isCourseRootExpanded, setIsCourseRootExpanded] = useState(true);
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<string[]>([]);
  const [pendingCreate, setPendingCreate] = useState<PendingCreate | null>(null);
  const [pendingTitle, setPendingTitle] = useState("");
  const [pendingError, setPendingError] = useState<string | null>(null);

  const createSectionMutation = useCreateCourseSectionMutation();
  const createLessonMutation = useCreateCourseLessonMutation();
  const createSectionTestMutation = useCreateCourseSectionTestMutation();

  const sectionNodes: SectionNode[] = sections.map((section) => ({
    children: [
      ...section.lessons.map(
        (lesson): DocumentNode => ({
          hasTest: lesson.test !== null,
          id: lesson.id,
          title: lesson.title,
          type: "document",
        }),
      ),
      ...section.tests.map(
        (test): TestNode => ({
          id: test.id,
          title: test.title,
          type: "test",
        }),
      ),
    ],
    id: section.id,
    title: section.title,
    type: "section",
  }));

  function selectTest(lessonId: string) {
    onSelectionChange?.({
      id: resolveTestIdForLesson(lessonId),
      title: "Test",
      type: "test",
    });
  }

  function startAddSection() {
    setPendingCreate({ type: "section" });
    setPendingTitle(`Section ${sections.length + 1}`);
    setPendingError(null);
    setIsCourseRootExpanded(true);
  }

  function startAddDocument(sectionId: string) {
    const section = sections.find((candidate) => candidate.id === sectionId);

    setPendingCreate({ sectionId, type: "document" });
    setPendingTitle(`Document ${(section?.lessons.length ?? 0) + 1}`);
    setPendingError(null);
    setCollapsedSectionIds((currentIds) => currentIds.filter((id) => id !== sectionId));
  }

  function startAddTest(sectionId: string) {
    const section = sections.find((candidate) => candidate.id === sectionId);

    setPendingCreate({ sectionId, type: "test" });
    setPendingTitle(`Test ${(section?.tests.length ?? 0) + 1}`);
    setPendingError(null);
    setCollapsedSectionIds((currentIds) => currentIds.filter((id) => id !== sectionId));
  }

  function cancelPendingCreate() {
    setPendingCreate(null);
    setPendingTitle("");
    setPendingError(null);
  }

  async function commitPendingCreate() {
    if (!pendingCreate) {
      return;
    }

    const title = pendingTitle.trim();

    if (!title) {
      cancelPendingCreate();
      return;
    }

    const normalizedTitle = title.toLowerCase();

    if (pendingCreate.type === "section") {
      const isDuplicate = sections.some(
        (section) => section.title.trim().toLowerCase() === normalizedTitle,
      );

      if (isDuplicate) {
        setPendingError(`A section titled "${title}" already exists`);
        return;
      }
    } else if (pendingCreate.type === "document") {
      const targetSection = sections.find(
        (section) => section.id === pendingCreate.sectionId,
      );
      const isDuplicate = targetSection?.lessons.some(
        (lesson) => lesson.title.trim().toLowerCase() === normalizedTitle,
      );

      if (isDuplicate) {
        setPendingError(`A document titled "${title}" already exists in this section`);
        return;
      }
    } else {
      const targetSection = sections.find(
        (section) => section.id === pendingCreate.sectionId,
      );
      const isDuplicate = targetSection?.tests.some(
        (test) => test.title.trim().toLowerCase() === normalizedTitle,
      );

      if (isDuplicate) {
        setPendingError(`A test titled "${title}" already exists in this section`);
        return;
      }
    }

    try {
      if (pendingCreate.type === "section") {
        const result = await createSectionMutation.mutateAsync({ courseId, title });
        onSelectionChange?.({ id: result.sectionId, title, type: "section" });
      } else if (pendingCreate.type === "document") {
        const result = await createLessonMutation.mutateAsync({
          courseId,
          sectionId: pendingCreate.sectionId,
          title,
        });
        onSelectionChange?.({ id: result.lessonId, title, type: "document" });
      } else {
        const result = await createSectionTestMutation.mutateAsync({
          courseId,
          sectionId: pendingCreate.sectionId,
          title,
        });
        onSelectionChange?.({ id: result.testId, title, type: "test" });
      }

      cancelPendingCreate();
    } catch (error) {
      setPendingError(error instanceof Error ? error.message : "Could not save");
    }
  }

  function toggleSection(sectionId: string) {
    setCollapsedSectionIds((currentIds) =>
      currentIds.includes(sectionId)
        ? currentIds.filter((id) => id !== sectionId)
        : [...currentIds, sectionId],
    );
  }

  return (
    <div className={compact ? "flex flex-col gap-4" : "flex flex-col gap-8"}>
      {compact ? null : (
        <div className="space-y-3 border-b border-stone-200 pb-6">
          <h1 className="text-4xl font-semibold tracking-tight text-stone-950">
            Prototype 2
          </h1>
          <CardDescription className="max-w-3xl">
            Explore a course structure as a compact file tree with root
            sections and documents.
          </CardDescription>
        </div>
      )}

      <section className="overflow-hidden rounded-sm border border-stone-200 bg-white shadow-[0_12px_30px_-24px_rgba(28,25,23,0.12)]">
        {showFrameHeader && (
          <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-4 py-2">
            <Eyebrow>Explorer</Eyebrow>
          </div>
        )}

        <div className={compact ? "p-1.5" : "p-2"}>
          <div className="space-y-0.5">
            <ExplorerRow
              canMoveDown={false}
              canMoveUp={false}
              icon={Folder}
              isExpanded={isCourseRootExpanded}
              isFixed
              isSelected={selectedNodeId === courseRootId}
              label="Root"
              onSelect={() =>
                onSelectionChange?.({
                  id: courseRootId,
                  title: courseTitle,
                  type: "course",
                })
              }
              onInsertSection={startAddSection}
              onMoveDown={() => {}}
              onMoveUp={() => {}}
              onToggle={() => setIsCourseRootExpanded((current) => !current)}
              title={courseTitle}
            />
            {isCourseRootExpanded && (
              <div className="ml-3 border-l border-stone-200 pl-3">
                {sectionNodes.length === 0 && !pendingCreate ? (
                  <div className="rounded-sm px-3 py-3 text-sm text-stone-500">
                    No sections yet. Right-click the root folder to add one.
                  </div>
                ) : (
                  sectionNodes.map((node) => (
                    <SectionRow
                      key={node.id}
                      node={node}
                      onAddDocument={() => startAddDocument(node.id)}
                      onAddTest={() => startAddTest(node.id)}
                      onSelectionChange={onSelectionChange}
                      onSelectTest={selectTest}
                      pendingDocument={
                        pendingCreate?.type === "document" &&
                        pendingCreate.sectionId === node.id
                          ? { error: pendingError, title: pendingTitle }
                          : null
                      }
                      pendingTest={
                        pendingCreate?.type === "test" &&
                        pendingCreate.sectionId === node.id
                          ? { error: pendingError, title: pendingTitle }
                          : null
                      }
                      onPendingCreateCancel={cancelPendingCreate}
                      onPendingCreateChange={setPendingTitle}
                      onPendingCreateCommit={commitPendingCreate}
                      onToggle={() => toggleSection(node.id)}
                      sectionIsExpanded={!collapsedSectionIds.includes(node.id)}
                      selectedNodeId={selectedNodeId}
                    />
                  ))
                )}
                {pendingCreate?.type === "section" && (
                  <PendingRow
                    error={pendingError}
                    icon={Folder}
                    label="Section"
                    onCancel={cancelPendingCreate}
                    onChange={setPendingTitle}
                    onCommit={commitPendingCreate}
                    title={pendingTitle}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionRow({
  node,
  onAddDocument,
  onAddTest,
  onPendingCreateCancel,
  onPendingCreateChange,
  onPendingCreateCommit,
  onSelectionChange,
  onSelectTest,
  onToggle,
  pendingDocument,
  pendingTest,
  sectionIsExpanded,
  selectedNodeId,
}: {
  node: SectionNode;
  onAddDocument: () => void;
  onAddTest: () => void;
  onPendingCreateCancel: () => void;
  onPendingCreateChange: (title: string) => void;
  onPendingCreateCommit: () => void;
  onSelectionChange?: (selection: StructureSelection) => void;
  onSelectTest: (lessonId: string) => void;
  onToggle: () => void;
  pendingDocument: { error: string | null; title: string } | null;
  pendingTest: { error: string | null; title: string } | null;
  sectionIsExpanded: boolean;
  selectedNodeId: string;
}) {
  return (
    <div>
      <ExplorerRow
        canMoveDown={false}
        canMoveUp={false}
        icon={Folder}
        isExpanded={sectionIsExpanded}
        isFixed
        isSelected={selectedNodeId === node.id}
        label="Section"
        onInsertDocument={onAddDocument}
        onInsertTest={onAddTest}
        onMoveDown={() => {}}
        onMoveUp={() => {}}
        onSelect={() =>
          onSelectionChange?.({ id: node.id, title: node.title, type: node.type })
        }
        onToggle={onToggle}
        title={node.title}
      />

      {sectionIsExpanded && (
        <div className="ml-3 border-l border-stone-200 pl-3">
          {node.children.map((child) =>
            child.type === "document" ? (
              <div key={child.id}>
                <ExplorerRow
                  canMoveDown={false}
                  canMoveUp={false}
                  icon={FileText}
                  isFixed
                  isSelected={selectedNodeId === child.id}
                  label="Document"
                  onInsertTest={child.hasTest ? undefined : () => onSelectTest(child.id)}
                  onMoveDown={() => {}}
                  onMoveUp={() => {}}
                  onOpen={() => {}}
                  onSelect={() =>
                    onSelectionChange?.({
                      id: child.id,
                      title: child.title,
                      type: child.type,
                    })
                  }
                  title={child.title}
                />
                {child.hasTest && (
                  <div className="ml-3 pl-3">
                    <ExplorerRow
                      canMoveDown={false}
                      canMoveUp={false}
                      icon={FlaskConical}
                      isFixed
                      isSelected={selectedNodeId === resolveTestIdForLesson(child.id)}
                      label="Test"
                      onMoveDown={() => {}}
                      onMoveUp={() => {}}
                      onSelect={() => onSelectTest(child.id)}
                      title="Test"
                    />
                  </div>
                )}
              </div>
            ) : (
              <ExplorerRow
                canMoveDown={false}
                canMoveUp={false}
                icon={FlaskConical}
                isFixed
                isSelected={selectedNodeId === child.id}
                key={child.id}
                label="Test"
                onMoveDown={() => {}}
                onMoveUp={() => {}}
                onSelect={() =>
                  onSelectionChange?.({
                    id: child.id,
                    title: child.title,
                    type: child.type,
                  })
                }
                title={child.title}
              />
            ),
          )}
          {pendingDocument && (
            <PendingRow
              error={pendingDocument.error}
              icon={FileText}
              label="Document"
              onCancel={onPendingCreateCancel}
              onChange={onPendingCreateChange}
              onCommit={onPendingCreateCommit}
              title={pendingDocument.title}
            />
          )}
          {pendingTest && (
            <PendingRow
              error={pendingTest.error}
              icon={FlaskConical}
              label="Test"
              onCancel={onPendingCreateCancel}
              onChange={onPendingCreateChange}
              onCommit={onPendingCreateCommit}
              title={pendingTest.title}
            />
          )}
        </div>
      )}
    </div>
  );
}

function PendingRow({
  error,
  icon,
  label,
  onCancel,
  onChange,
  onCommit,
  title,
}: {
  error: string | null;
  icon: LucideIcon;
  label: string;
  onCancel: () => void;
  onChange: (title: string) => void;
  onCommit: () => void;
  title: string;
}) {
  return (
    <div>
      <ExplorerRow
        autoFocus
        canMoveDown={false}
        canMoveUp={false}
        icon={icon}
        isEditing
        isFixed
        label={label}
        onChange={onChange}
        onEditDone={onCommit}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onCancel();
          }
        }}
        onMoveDown={() => {}}
        onMoveUp={() => {}}
        title={title}
      />
      {error && <p className="px-2 pb-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function ExplorerRow({
  autoFocus = false,
  canMoveDown,
  canMoveUp,
  icon: Icon,
  isFixed = false,
  isEditing = false,
  isExpanded,
  isSelected = false,
  label,
  onChange,
  onEditDone,
  onInsertDocument,
  onInsertSection,
  onInsertTest,
  onKeyDown,
  onMoveDown,
  onMoveUp,
  onOpen,
  onSelect,
  onToggle,
  title,
}: {
  autoFocus?: boolean;
  canMoveDown: boolean;
  canMoveUp: boolean;
  icon: LucideIcon;
  isFixed?: boolean;
  isEditing?: boolean;
  isExpanded?: boolean;
  isSelected?: boolean;
  label: string;
  onChange?: (title: string) => void;
  onEditDone?: () => void;
  onInsertDocument?: () => void;
  onInsertSection?: () => void;
  onInsertTest?: () => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onOpen?: () => void;
  onSelect?: () => void;
  onToggle?: () => void;
  title: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);

  useEffect(() => {
    if (!autoFocus || !isEditing) {
      return;
    }

    inputRef.current?.select();
  }, [autoFocus, isEditing]);

  return (
    <ContextMenu onOpenChange={setIsContextMenuOpen} open={isContextMenuOpen}>
      <ContextMenuTrigger>
        <div
          className={[
            "group/row flex min-h-8 cursor-pointer items-center gap-1 rounded-sm px-1 text-sm text-stone-700 hover:bg-stone-100",
            isSelected || isContextMenuOpen ? "bg-stone-100 text-stone-950" : "",
          ].join(" ")}
          onClick={onSelect}
        >
          <button
            className={[
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-stone-500",
              onToggle ? "hover:bg-stone-200 hover:text-stone-800" : "invisible",
            ].join(" ")}
            onClick={onToggle}
            type="button"
          >
            {onToggle ? (
              isExpanded ? (
                <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
              )
            ) : null}
          </button>

          <Icon
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-stone-500"
          />

          <div className="min-w-0 flex-1">
            {isEditing ? (
              <Input
                autoFocus={autoFocus}
                className="h-7 border-0 bg-transparent px-1 text-sm text-stone-950 shadow-none placeholder:text-stone-300 focus-visible:ring-0"
                onBlur={onEditDone}
                onChange={(event) => onChange?.(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }

                  onKeyDown?.(event);
                }}
                placeholder={`Untitled ${label.toLowerCase()}`}
                ref={inputRef}
                value={title}
              />
            ) : (
              <div className="block w-full truncate rounded-sm px-1 py-1 text-left text-sm text-stone-800">
                {title || `Untitled ${label.toLowerCase()}`}
              </div>
            )}
          </div>

          {onInsertSection && (
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <Button
                  aria-label="Add section"
                  className="shrink-0 text-stone-500"
                  onClick={(event) => {
                    event.stopPropagation();
                    onInsertSection();
                  }}
                  size="icon-sm"
                  variant="ghost"
                >
                  <FolderPlus aria-hidden="true" className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Add section</TooltipContent>
            </Tooltip>
          )}

          {onInsertDocument && (
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <Button
                  aria-label="Add document"
                  className="shrink-0 text-stone-500"
                  onClick={(event) => {
                    event.stopPropagation();
                    onInsertDocument();
                  }}
                  size="icon-sm"
                  variant="ghost"
                >
                  <FilePlus2 aria-hidden="true" className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Add document</TooltipContent>
            </Tooltip>
          )}

          {onInsertTest && (
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <Button
                  aria-label="Add test"
                  className="shrink-0 text-stone-500"
                  onClick={(event) => {
                    event.stopPropagation();
                    onInsertTest();
                  }}
                  size="icon-sm"
                  variant="ghost"
                >
                  <FlaskConical aria-hidden="true" className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Add test</TooltipContent>
            </Tooltip>
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-44">
        {onInsertDocument && (
          <ContextMenuItem onClick={onInsertDocument}>
            <FileText aria-hidden="true" />
            <span>Add document</span>
          </ContextMenuItem>
        )}
        {onInsertTest && (
          <ContextMenuItem onClick={onInsertTest}>
            <FlaskConical aria-hidden="true" />
            <span>Add test</span>
          </ContextMenuItem>
        )}
        {onInsertSection && (
          <ContextMenuItem onClick={onInsertSection}>
            <Folder aria-hidden="true" />
            <span>Add section</span>
          </ContextMenuItem>
        )}
        {(onInsertDocument || onInsertTest || onInsertSection) && (
          <ContextMenuSeparator />
        )}
        {onOpen && (
          <ContextMenuItem onClick={onOpen}>
            <PanelRightOpen aria-hidden="true" />
            <span>Open</span>
          </ContextMenuItem>
        )}
        {onOpen && <ContextMenuSeparator />}
        {!isFixed && (
          <ContextMenuItem disabled={!canMoveUp} onClick={onMoveUp}>
            <ArrowUp aria-hidden="true" />
            <span>Move up</span>
          </ContextMenuItem>
        )}
        {!isFixed && (
          <ContextMenuItem disabled={!canMoveDown} onClick={onMoveDown}>
            <ArrowDown aria-hidden="true" />
            <span>Move down</span>
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
