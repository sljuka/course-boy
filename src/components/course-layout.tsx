import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIsMutating } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useParams } from "react-router-dom";

import { AppSidebar } from "@/components/app-sidebar";
import { RegisterTitleBarSidebarToggle } from "@/components/app-title-bar/register-title-bar-sidebar-toggle";
import { VersionsPanel } from "@/components/course-details/versions-panel";
import { CourseStructurePrototype } from "@/components/course-structure-prototype/course-structure-prototype";
import {
  courseRootId,
  type StructureSelection,
} from "@/components/course-structure-prototype/course-structure-prototype-types";
import { AppStatusBarEnd } from "@/components/app-frame/app-status-bar-end";
import { buildEditorBreadcrumbs } from "@/components/draft-details/editor-breadcrumbs";
import { OnboardingGuard } from "@/components/onboarding-guard";
import { PagePanel } from "@/components/ui/page-panel";
import { EditorStatusBar } from "@/components/ui/editor-status-bar";
import { PanelCard } from "@/components/ui/panel-card";
import { SidebarProvider } from "@/components/ui/sidebar";
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
import { useSidePanelPreference } from "@/lib/explorer-panel-queries";
import { LayoutBreadcrumbsContext } from "@/lib/use-layout-breadcrumbs";
import { PageSidePanelsContext, type PageSidePanels } from "@/lib/use-page-side-panel";
import { SerbianScriptContext } from "@/lib/use-serbian-script";
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
  const { t } = useTranslation();
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

  const breadcrumbs = useMemo(
    () =>
      buildEditorBreadcrumbs({
        courseTitle,
        myCoursesLabel: t("sidebar.myCourses"),
        onSelect: setSelectedNode,
        sections: courseDetailsQuery.data?.sections ?? [],
        selectedNode,
        testLabel: t("explorer.testLabel"),
      }),
    [courseDetailsQuery.data?.sections, courseTitle, selectedNode, t],
  );

  const [explorerPanel, updateExplorerPanel] = useSidePanelPreference("explorerPanel");
  const [versionsPanel, updateVersionsPanel] = useSidePanelPreference("versionsPanel");
  const sections = courseDetailsQuery.data?.sections;
  // Every editor page shares two panels: the explorer on the left and the
  // course's versions on the right.
  const sidePanels = useMemo<PageSidePanels>(
    () => ({
      left: {
        content: (
          <ExplorerPanelContent
            courseId={courseId ?? ""}
            courseTitle={courseTitle}
            onSelectionChange={setSelectedNode}
            sections={sections ?? []}
            selectedNodeId={selectedNode.id}
          />
        ),
        dismissKey: selectedNode.id,
        label: t("explorer.title"),
        onOpenChange: (open) => updateExplorerPanel({ open }),
        open: explorerPanel.open,
        toggleLabel: t("explorer.toggle"),
      },
      right: {
        content: (
          <div className="p-2">
            <VersionsPanel courseId={courseId ?? ""} />
          </div>
        ),
        label: t("courseVersions.panelTitle"),
        onOpenChange: (open) => updateVersionsPanel({ open }),
        open: versionsPanel.open,
        toggleLabel: t("courseVersions.togglePanel"),
      },
    }),
    [
      courseId,
      courseTitle,
      explorerPanel.open,
      sections,
      selectedNode.id,
      t,
      updateExplorerPanel,
      updateVersionsPanel,
      versionsPanel.open,
    ],
  );

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
      <SidebarProvider style={{ "--sidebar-width": "14rem" } as React.CSSProperties}>
        <RegisterTitleBarSidebarToggle />
        <AppSidebar />
        <SerbianScriptContext.Provider value={courseDetailsQuery.data?.serbianScript ?? null}>
        <PageSidePanelsContext.Provider value={sidePanels}>
        <LayoutBreadcrumbsContext.Provider value={breadcrumbs}>
        <PagePanel>
          <div className="flex min-h-0 flex-1 flex-col">
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
          <AppStatusBarEnd>
            <EditorStatusBar
              action={editorStatusAction}
              message={
                courseDetailsQuery.isLoading
                  ? t("editorStatus.loading")
                  : forwardedAutosave.status === "error"
                    ? forwardedAutosave.errorMessage ?? t("editorStatus.saveFailed")
                    : isSavingAnyEntity
                      ? t("editorStatus.saving")
                      : forwardedAutosave.status === "dirty"
                        ? t("editorStatus.savingSoon")
                        : t("editorStatus.saved")
              }
              onRetry={forwardedAutosave.status === "error" ? forwardedAutosave.retry ?? undefined : undefined}
              retryLabel={t("editorStatus.retry")}
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
          </AppStatusBarEnd>
        </PagePanel>
        </LayoutBreadcrumbsContext.Provider>
        </PageSidePanelsContext.Provider>
        </SerbianScriptContext.Provider>
      </SidebarProvider>
    </OnboardingGuard>
  );
};

// The explorer as the editor's left side panel (see `PageSidePanelsContext`).
function ExplorerPanelContent({
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
  const { t } = useTranslation();

  return (
    <div className="p-2">
      <PanelCard title={t("explorer.title")}>
        <CourseStructurePrototype
          compact
          courseId={courseId}
          courseTitle={courseTitle || "Course"}
          framed={false}
          onSelectionChange={onSelectionChange}
          sections={sections}
          selectedNodeId={selectedNodeId}
          showFrameHeader={false}
        />
      </PanelCard>
    </div>
  );
}
