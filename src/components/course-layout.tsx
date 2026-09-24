import { useCallback, useEffect, useRef, useState } from "react";
import { useIsMutating } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useParams } from "react-router-dom";

import { CourseStructurePrototype } from "@/components/course-structure-prototype/course-structure-prototype";
import {
  courseRootId,
  type StructureSelection,
} from "@/components/course-structure-prototype/course-structure-prototype-types";
import { OnboardingGuard } from "@/components/onboarding-guard";
import { EditorStatusBar } from "@/components/ui/editor-status-bar";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import type { CourseTagDefinition } from "@/lib/course-tags";
import { courseContentSaveMutationKey, useCourseDetailsQuery } from "@/lib/course-queries";
import type {
  ContentRating,
  CourseSectionPreview,
  CourseVersionBadge,
  LocalizedCourseMetadata,
} from "@/lib/course-package";
import type { EntityAutosaveStatus } from "@/lib/use-entity-autosave";
import { useAppState } from "@/lib/use-app-state";
import type { Locale } from "@/lib/i18n";

type CourseLayoutOutletContext = {
  contentRating: ContentRating;
  courseDescriptiveTags: CourseTagDefinition[];
  courseDescription: string;
  courseSections: CourseSectionPreview[];
  courseTitle: string;
  defaultLocale: Locale;
  isCourseDetailsLoading: boolean;
  localizedCourse: Partial<Record<Locale, LocalizedCourseMetadata>>;
  reportAutosaveStatus: (
    status: EntityAutosaveStatus | null,
    errorMessage: string | null,
    retry?: () => void,
  ) => void;
  selectedNode: StructureSelection;
  setEditorStatusAction: (action: ReactNode | null) => void;
  setSelectedNode: (selection: StructureSelection) => void;
  supportedLocales: Locale[];
  versionBadge: CourseVersionBadge | undefined;
};

export type { ContentRating, CourseLayoutOutletContext };

function getCourseTitle(
  localizedCourse: Partial<Record<Locale, LocalizedCourseMetadata>>,
  defaultLocale: Locale,
) {
  return localizedCourse[defaultLocale]?.title || "Course";
}

function getCourseDescription(
  localizedCourse: Partial<Record<Locale, LocalizedCourseMetadata>>,
  defaultLocale: Locale,
) {
  return localizedCourse[defaultLocale]?.description || "";
}

export const CourseLayout = () => {
  const { courseId } = useParams<{ courseId: string }>();

  return <CourseLayoutForCourse courseId={courseId} key={courseId ?? "none"} />;
};

const CourseLayoutForCourse = ({ courseId }: { courseId: string | undefined }) => {
  const { locale } = useAppState();
  const location = useLocation();
  const [editorStatusAction, setEditorStatusAction] = useState<ReactNode | null>(null);
  const [forwardedAutosave, setForwardedAutosave] = useState<{
    errorMessage: string | null;
    retry: (() => void) | null;
    status: EntityAutosaveStatus | null;
  }>({ errorMessage: null, retry: null, status: null });
  // Restored from `location.state` when we're arriving back from the
  // "Preview test" route (`DraftTestPreviewPage`), which round-trips the
  // node that was selected before preview opened — otherwise this remount
  // (navigating to preview and back is a real route change, so this whole
  // layout unmounts and remounts) would silently reset the explorer back to
  // the course root instead of the test the teacher was just editing. Kept
  // in a ref (not just read once into `useState`) so the hydration effects
  // below — which otherwise unconditionally set `selectedNode` back to the
  // course root once query data resolves — know to leave a restored
  // selection alone.
  const restoredSelectedNodeRef = useRef(
    (location.state as { selectedNode?: StructureSelection } | null)?.selectedNode ?? null,
  );
  const [selectedNode, setSelectedNode] = useState<StructureSelection>(
    () =>
      restoredSelectedNodeRef.current ?? {
        id: courseRootId,
        title: "Course",
        type: "course",
      },
  );
  const courseDetailsQuery = useCourseDetailsQuery(courseId, locale);
  // Course metadata now hydrates directly from the course-details query —
  // there is no aggregate draft snapshot to reconcile it against. Each
  // consuming editor (the course-root branch in `DraftDetailPage`) seeds its
  // own local edit state from these persisted values and autosaves changes
  // straight back through `useUpdateDraftMetadataMutation`.
  const contentRating: ContentRating = courseDetailsQuery.data?.contentRating ?? "all-ages";
  const defaultLocale: Locale = courseDetailsQuery.data?.defaultLocale ?? locale;
  const localizedCourse = courseDetailsQuery.data?.locales ?? {};
  const supportedLocales = courseDetailsQuery.data?.supportedLocales ?? [locale];
  const courseTitle = getCourseTitle(localizedCourse, defaultLocale);
  const courseDescription = getCourseDescription(localizedCourse, defaultLocale);
  // "Saving…" reflects any in-flight entity-content mutation, anywhere in
  // the app — no need to plumb a per-entity boolean up through context.
  const isSavingAnyEntity = useIsMutating({ mutationKey: courseContentSaveMutationKey }) > 0;

  const reportAutosaveStatus = useCallback(
    (status: EntityAutosaveStatus | null, errorMessage: string | null, retry?: () => void) => {
      setForwardedAutosave({ errorMessage, retry: retry ?? null, status });
    },
    [],
  );

  useEffect(() => {
    setSelectedNode((currentSelection) =>
      currentSelection.id === courseRootId
        ? {
            ...currentSelection,
            title: courseTitle,
          }
        : currentSelection,
    );
  }, [courseTitle]);

  useEffect(() => {
    setEditorStatusAction(null);
    setForwardedAutosave({ errorMessage: null, retry: null, status: null });
  }, [selectedNode.id]);

  return (
    <OnboardingGuard>
      <SidebarProvider
        className="page-fade-in bg-background"
        style={{ "--sidebar-width": "22rem" } as React.CSSProperties}
      >
        <ExplorerSidebar
          courseId={courseId ?? ""}
          courseTitle={courseTitle}
          onSelectionChange={setSelectedNode}
          sections={courseDetailsQuery.data?.sections ?? []}
          selectedNodeId={selectedNode.id}
        />
        <SidebarInset>
          <div className="min-h-0 flex-1 overflow-auto pb-20">
            <Outlet
              context={
                {
                  contentRating,
                  courseDescriptiveTags:
                    courseDetailsQuery.data?.descriptiveTags ?? [],
                  courseDescription,
                  courseSections: courseDetailsQuery.data?.sections ?? [],
                  courseTitle,
                  defaultLocale,
                  isCourseDetailsLoading: courseDetailsQuery.isLoading,
                  localizedCourse,
                  reportAutosaveStatus,
                  selectedNode,
                  setEditorStatusAction,
                  setSelectedNode,
                  supportedLocales,
                  versionBadge: courseDetailsQuery.data?.versionBadge,
                } satisfies CourseLayoutOutletContext
              }
            />
          </div>
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 print:hidden">
            <div className="pointer-events-auto md:pl-(--sidebar-width)">
              <EditorStatusBar
                action={editorStatusAction}
                message={
                  courseDetailsQuery.isLoading
                    ? "Loading…"
                    : forwardedAutosave.status === "error"
                      ? forwardedAutosave.errorMessage ?? "Save failed"
                      : isSavingAnyEntity
                        ? "Saving…"
                        : forwardedAutosave.status === "dirty"
                          ? "Saving soon…"
                          : "All changes saved"
                }
                onRetry={forwardedAutosave.status === "error" ? forwardedAutosave.retry ?? undefined : undefined}
                status={
                  courseDetailsQuery.isLoading
                    ? "saving"
                    : forwardedAutosave.status === "error"
                      ? "error"
                      : isSavingAnyEntity
                        ? "saving"
                        : forwardedAutosave.status === "dirty"
                          ? "dirty"
                          : "saved"
                }
              />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </OnboardingGuard>
  );
};

function ExplorerSidebar({
  courseId,
  courseTitle,
  onSelectionChange,
  sections,
  selectedNodeId,
}: {
  courseId: string;
  courseTitle: string;
  onSelectionChange: (selection: StructureSelection) => void;
  sections: CourseSectionPreview[];
  selectedNodeId: string;
}) {
  const { setOpenMobile } = useSidebar();

  function handleSelectionChange(selection: StructureSelection) {
    onSelectionChange(selection);
    setOpenMobile(false);
  }

  return (
    <Sidebar className="print:hidden" collapsible="offcanvas">
      <SidebarHeader className="border-b px-4 py-4">
        <Link
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          to="/my-courses"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          <span>Back to my courses</span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="bg-muted p-3">
        <Eyebrow className="px-1 pb-3" size="small">
          Explorer
        </Eyebrow>
        <CourseStructurePrototype
          compact
          courseId={courseId}
          courseTitle={courseTitle || "Course"}
          onSelectionChange={handleSelectionChange}
          sections={sections}
          selectedNodeId={selectedNodeId}
          showFrameHeader={false}
        />
      </SidebarContent>
    </Sidebar>
  );
}
