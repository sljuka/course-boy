import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import type { ReactNode } from "react";
import { useParams } from "react-router-dom";

import { CourseStructurePrototype } from "@/components/course-structure-prototype/course-structure-prototype";
import {
  courseRootId,
  type StructureSelection,
} from "@/components/course-structure-prototype/course-structure-prototype-types";
import { OnboardingGuard } from "@/components/onboarding-guard";
import { Button } from "@/components/ui/button";
import { EditorStatusBar } from "@/components/ui/editor-status-bar";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useCourseDetailsQuery } from "@/lib/course-queries";
import { useDraftEditorRecordQuery } from "@/lib/draft-editor-queries";
import type {
  ContentRating,
  DraftEditorSnapshot,
} from "@/lib/draft-editor-types";
import { useDraftEditorAutosave } from "@/lib/use-draft-editor-autosave";
import { useAppState } from "@/lib/use-app-state";
import type { Locale } from "@/lib/i18n";

type CourseLayoutOutletContext = {
  contentRating: ContentRating;
  courseDescription: string;
  courseTitle: string;
  initialDraftSnapshot: DraftEditorSnapshot | null;
  initialDraftSnapshotLoaded: boolean;
  setDraftSnapshot: (snapshot: DraftEditorSnapshot) => void;
  setEditorStatusAction: (action: ReactNode | null) => void;
  selectedNode: StructureSelection;
  setContentRating: (contentRating: ContentRating) => void;
  setCourseDescription: (description: string) => void;
  setCourseTitle: (title: string) => void;
  setSelectedNode: (selection: StructureSelection) => void;
  setSupportedLocales: (locales: Locale[]) => void;
  supportedLocales: Locale[];
};

export type { ContentRating, CourseLayoutOutletContext };

function resolveHydratedCourseTitle(
  snapshotTitle: string,
  courseTitle: string | undefined,
) {
  if (snapshotTitle === "Course" && courseTitle && courseTitle !== "Course") {
    return courseTitle;
  }

  return snapshotTitle || courseTitle || "Course";
}

function resolveHydratedCourseDescription(
  snapshotDescription: string,
  courseDescription: string | undefined,
) {
  if (!snapshotDescription && courseDescription) {
    return courseDescription;
  }

  return snapshotDescription || courseDescription || "";
}

function resolveHydratedSupportedLocales(
  snapshotLocales: Locale[],
  courseLocales: Locale[] | undefined,
) {
  if (
    snapshotLocales.length === 1 &&
    snapshotLocales[0] === "en" &&
    courseLocales &&
    courseLocales.length > 0
  ) {
    return courseLocales;
  }

  return snapshotLocales.length > 0 ? snapshotLocales : (courseLocales ?? []);
}

function resolveHydratedContentRating(
  snapshotContentRating: ContentRating | undefined,
  courseContentRating: ContentRating | undefined,
) {
  return snapshotContentRating ?? courseContentRating ?? "all-ages";
}

export const CourseLayout = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { locale } = useAppState();
  const [contentRating, setContentRating] = useState<ContentRating>("all-ages");
  const [courseTitle, setCourseTitle] = useState("Course");
  const [courseDescription, setCourseDescription] = useState("");
  const [supportedLocales, setSupportedLocales] = useState<Locale[]>([locale]);
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [draftSnapshot, setDraftSnapshotState] = useState<DraftEditorSnapshot | null>(
    null,
  );
  const [editorStatusAction, setEditorStatusAction] = useState<ReactNode | null>(null);
  const hasHydratedInitialDraftRef = useRef(false);
  const [selectedNode, setSelectedNode] = useState<StructureSelection>({
    id: courseRootId,
    title: "Course",
    type: "course",
  });
  const courseDetailsQuery = useCourseDetailsQuery(courseId, locale);
  const draftEditorRecordQuery = useDraftEditorRecordQuery(courseId);
  const initialDraftSnapshot = draftEditorRecordQuery.data?.snapshot ?? null;
  const initialDraftSnapshotLoaded = draftEditorRecordQuery.isSuccess;
  const autosave = useDraftEditorAutosave({
    courseId,
    initialRecord: draftEditorRecordQuery.data,
    isReady: initialDraftSnapshotLoaded && draftSnapshot !== null,
    snapshot: draftSnapshot,
  });

  useEffect(() => {
    if (
      hasHydratedInitialDraftRef.current ||
      !initialDraftSnapshotLoaded ||
      !initialDraftSnapshot
    ) {
      return;
    }

    const resolvedCourseTitle = resolveHydratedCourseTitle(
      initialDraftSnapshot.courseTitle,
      courseDetailsQuery.data?.title,
    );
    const resolvedCourseDescription = resolveHydratedCourseDescription(
      initialDraftSnapshot.courseDescription,
      courseDetailsQuery.data?.description,
    );
    const resolvedSupportedLocales = resolveHydratedSupportedLocales(
      initialDraftSnapshot.supportedLocales,
      courseDetailsQuery.data?.supportedLocales,
    );
    const resolvedContentRating = resolveHydratedContentRating(
      initialDraftSnapshot.contentRating,
      courseDetailsQuery.data?.contentRating,
    );

    setContentRating(resolvedContentRating);
    setCourseDescription(resolvedCourseDescription);
    setCourseTitle(resolvedCourseTitle);
    setSupportedLocales(resolvedSupportedLocales);
    setSelectedNode({
      id: courseRootId,
      title: resolvedCourseTitle,
      type: "course",
    });
    hasHydratedInitialDraftRef.current = true;
  }, [
    courseDetailsQuery.data?.description,
    courseDetailsQuery.data?.supportedLocales,
    courseDetailsQuery.data?.title,
    initialDraftSnapshot,
    initialDraftSnapshotLoaded,
  ]);

  useEffect(() => {
    if (
      hasHydratedInitialDraftRef.current ||
      !initialDraftSnapshotLoaded ||
      initialDraftSnapshot ||
      courseDetailsQuery.isLoading ||
      !courseDetailsQuery.data
    ) {
      return;
    }

    setCourseDescription(courseDetailsQuery.data.description);
    setContentRating(courseDetailsQuery.data.contentRating);
    setCourseTitle(courseDetailsQuery.data.title);
    setSupportedLocales(courseDetailsQuery.data.supportedLocales);
    setSelectedNode({
      id: courseRootId,
      title: courseDetailsQuery.data.title || "Course",
      type: "course",
    });
    hasHydratedInitialDraftRef.current = true;
  }, [
    courseDetailsQuery.data,
    courseDetailsQuery.isLoading,
    initialDraftSnapshot,
    initialDraftSnapshotLoaded,
  ]);

  useEffect(() => {
    setEditorStatusAction(null);
  }, [selectedNode.id]);

  const setDraftSnapshot = useCallback((snapshot: DraftEditorSnapshot) => {
    setDraftSnapshotState((currentSnapshot) => {
      if (JSON.stringify(currentSnapshot) === JSON.stringify(snapshot)) {
        return currentSnapshot;
      }

      return snapshot;
    });
  }, []);

  function handleSelectionChange(selection: StructureSelection) {
    setSelectedNode(selection);
    setIsExplorerOpen(false);
  }

  return (
    <OnboardingGuard>
      <div className="page-fade-in flex min-h-screen flex-1 bg-white">
        {isExplorerOpen ? (
          <button
            aria-label="Close explorer overlay"
            className="fixed inset-0 z-40 bg-stone-950/25 backdrop-blur-sm lg:hidden"
            onClick={() => setIsExplorerOpen(false)}
            type="button"
          />
        ) : null}
        <aside
          className={[
            "fixed left-0 top-0 z-50 h-dvh w-[22rem] max-w-[calc(100vw-3rem)] flex-col border-r border-stone-200 bg-stone-100 transition-transform duration-200 ease-out lg:static lg:z-auto lg:flex lg:h-auto lg:w-full lg:max-w-[22rem] lg:shrink-0 lg:translate-x-0",
            isExplorerOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          ].join(" ")}
        >
          <div className="border-b border-stone-200 bg-white px-4 py-4">
            <Link
              className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
              to="/drafts"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              <span>Back to drafts</span>
            </Link>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3">
            <Eyebrow className="px-1 pb-3">Explorer</Eyebrow>
            <CourseStructurePrototype
              compact
              courseTitle={courseTitle || "Course"}
              onSelectionChange={handleSelectionChange}
              selectedNodeId={selectedNode.id}
              showFrameHeader={false}
            />
          </div>
        </aside>
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
          <div className="sticky left-0 top-0 z-30 flex items-center justify-start border-b border-stone-200/80 bg-white px-4 py-2 lg:hidden">
            <Button
              className="gap-2 border-stone-200 bg-white text-stone-700 shadow-[0_16px_40px_-28px_rgba(28,25,23,0.35)] hover:bg-stone-100 hover:text-stone-900"
              onClick={() => setIsExplorerOpen((current) => !current)}
              variant="secondary"
            >
              {isExplorerOpen ? (
                <PanelLeftClose aria-hidden="true" className="h-4 w-4" />
              ) : (
                <PanelLeftOpen aria-hidden="true" className="h-4 w-4" />
              )}
              <span>Explorer</span>
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto pb-20">
            <Outlet
              context={
                {
                  contentRating,
                  courseDescription,
                  courseTitle,
                  initialDraftSnapshot,
                  initialDraftSnapshotLoaded,
                  selectedNode,
                  setContentRating,
                  setCourseDescription,
                  setCourseTitle,
                  setDraftSnapshot,
                  setEditorStatusAction,
                  setSelectedNode,
                  setSupportedLocales,
                  supportedLocales,
                } satisfies CourseLayoutOutletContext
              }
            />
          </div>
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20">
            <div className="pointer-events-auto lg:pl-[22rem]">
              <EditorStatusBar
                action={editorStatusAction}
                message={
                  draftEditorRecordQuery.isLoading
                    ? "Loading draft…"
                    : autosave.status === "dirty"
                      ? "Updates detected"
                    : autosave.status === "saving"
                      ? "Saving…"
                      : autosave.status === "error"
                        ? autosave.errorMessage ?? "Save failed"
                        : "All changes saved"
                }
                onRetry={autosave.status === "error" ? autosave.saveNow : undefined}
                status={
                  draftEditorRecordQuery.isLoading || autosave.status === "saving"
                    ? "saving"
                    : autosave.status === "dirty"
                      ? "dirty"
                      : autosave.status === "error"
                      ? "error"
                      : "saved"
                }
              />
            </div>
          </div>
        </main>
      </div>
    </OnboardingGuard>
  );
};
