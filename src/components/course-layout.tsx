import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
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
import { useCourseDetailsQuery } from "@/lib/course-queries";
import { useDraftEditorRecordQuery } from "@/lib/draft-editor-queries";
import type {
  ContentRating,
  DraftEditorSnapshot,
} from "@/lib/draft-editor-types";
import type {
  CourseSectionPreview,
  CourseVersionBadge,
  LocalizedCourseMetadata,
} from "@/lib/course-package";
import { useDraftEditorAutosave } from "@/lib/use-draft-editor-autosave";
import { useAppState } from "@/lib/use-app-state";
import type { Locale } from "@/lib/i18n";

type CourseLayoutOutletContext = {
  contentRating: ContentRating;
  courseDescriptiveTags: CourseTagDefinition[];
  courseDescription: string;
  courseSections: CourseSectionPreview[];
  courseTitle: string;
  defaultLocale: Locale;
  initialDraftSnapshot: DraftEditorSnapshot | null;
  initialDraftSnapshotLoaded: boolean;
  localizedCourse: Partial<Record<Locale, LocalizedCourseMetadata>>;
  setDraftSnapshot: (snapshot: DraftEditorSnapshot) => void;
  setEditorStatusAction: (action: ReactNode | null) => void;
  selectedNode: StructureSelection;
  setContentRating: (contentRating: ContentRating) => void;
  setDefaultLocale: (locale: Locale) => void;
  setLocalizedCourse: (
    value:
      | Partial<Record<Locale, LocalizedCourseMetadata>>
      | ((
          currentLocalizedCourse: Partial<Record<Locale, LocalizedCourseMetadata>>,
        ) => Partial<Record<Locale, LocalizedCourseMetadata>>),
  ) => void;
  setSelectedNode: (selection: StructureSelection) => void;
  setSupportedLocales: (locales: Locale[]) => void;
  supportedLocales: Locale[];
  versionBadge: CourseVersionBadge | undefined;
};

export type { ContentRating, CourseLayoutOutletContext };

function createEmptyLocalizedCourse(): LocalizedCourseMetadata {
  return {
    description: "",
    title: "",
  };
}

function normalizeLocalizedCourse(
  localizedCourse: Partial<Record<Locale, LocalizedCourseMetadata>>,
  supportedLocales: Locale[],
  defaultLocale: Locale,
) {
  const nextLocalizedCourse = { ...localizedCourse };

  for (const locale of supportedLocales) {
    nextLocalizedCourse[locale] ??=
      locale === defaultLocale
        ? localizedCourse[defaultLocale] ?? createEmptyLocalizedCourse()
        : createEmptyLocalizedCourse();
  }

  return nextLocalizedCourse;
}

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

  return <CourseLayoutForCourse courseId={courseId} key={courseId ?? "none"} />;
};

const CourseLayoutForCourse = ({ courseId }: { courseId: string | undefined }) => {
  const { locale } = useAppState();
  const [contentRating, setContentRating] = useState<ContentRating>("all-ages");
  const [defaultLocale, setDefaultLocale] = useState<Locale>(locale);
  const [localizedCourse, setLocalizedCourseState] = useState<
    Partial<Record<Locale, LocalizedCourseMetadata>>
  >({});
  const [supportedLocales, setSupportedLocales] = useState<Locale[]>([locale]);
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
    courseSections: courseDetailsQuery.data?.sections ?? [],
    initialRecord: draftEditorRecordQuery.data,
    isReady: initialDraftSnapshotLoaded && draftSnapshot !== null,
    snapshot: draftSnapshot,
  });
  const courseTitle = getCourseTitle(localizedCourse, defaultLocale);
  const courseDescription = getCourseDescription(localizedCourse, defaultLocale);

  const setLocalizedCourse = useCallback(
    (
      value:
        | Partial<Record<Locale, LocalizedCourseMetadata>>
        | ((
            currentLocalizedCourse: Partial<Record<Locale, LocalizedCourseMetadata>>,
          ) => Partial<Record<Locale, LocalizedCourseMetadata>>),
    ) => {
      setLocalizedCourseState((currentLocalizedCourse) => {
        const nextLocalizedCourse =
          typeof value === "function" ? value(currentLocalizedCourse) : value;

        return normalizeLocalizedCourse(
          nextLocalizedCourse,
          supportedLocales,
          defaultLocale,
        );
      });
    },
    [defaultLocale, supportedLocales],
  );

  useEffect(() => {
    if (
      hasHydratedInitialDraftRef.current ||
      !initialDraftSnapshotLoaded ||
      !initialDraftSnapshot
    ) {
      return;
    }

    const resolvedDefaultLocale =
      initialDraftSnapshot.defaultLocale ?? courseDetailsQuery.data?.defaultLocale ?? locale;
    const resolvedSupportedLocales = resolveHydratedSupportedLocales(
      initialDraftSnapshot.supportedLocales,
      courseDetailsQuery.data?.supportedLocales,
    );
    const resolvedContentRating = resolveHydratedContentRating(
      initialDraftSnapshot.contentRating,
      courseDetailsQuery.data?.contentRating,
    );
    const resolvedLocalizedCourse = normalizeLocalizedCourse(
      {
        ...(courseDetailsQuery.data?.locales ?? {}),
        ...initialDraftSnapshot.localizedCourse,
      },
      resolvedSupportedLocales,
      resolvedDefaultLocale,
    );
    const resolvedCourseTitle = getCourseTitle(
      resolvedLocalizedCourse,
      resolvedDefaultLocale,
    );

    setContentRating(resolvedContentRating);
    setDefaultLocale(resolvedDefaultLocale);
    setLocalizedCourseState(resolvedLocalizedCourse);
    setSupportedLocales(resolvedSupportedLocales);
    setSelectedNode({
      id: courseRootId,
      title: resolvedCourseTitle,
      type: "course",
    });
    hasHydratedInitialDraftRef.current = true;
  }, [
    courseDetailsQuery.data?.contentRating,
    courseDetailsQuery.data?.defaultLocale,
    courseDetailsQuery.data?.locales,
    courseDetailsQuery.data?.supportedLocales,
    initialDraftSnapshot,
    initialDraftSnapshotLoaded,
    locale,
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

    setContentRating(courseDetailsQuery.data.contentRating);
    setDefaultLocale(courseDetailsQuery.data.defaultLocale);
    setLocalizedCourseState(
      normalizeLocalizedCourse(
        courseDetailsQuery.data.locales,
        courseDetailsQuery.data.supportedLocales,
        courseDetailsQuery.data.defaultLocale,
      ),
    );
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
    setLocalizedCourseState((currentLocalizedCourse) =>
      normalizeLocalizedCourse(
        currentLocalizedCourse,
        supportedLocales,
        defaultLocale,
      ),
    );
  }, [defaultLocale, supportedLocales]);

  useEffect(() => {
    if (supportedLocales.includes(defaultLocale)) {
      return;
    }

    setDefaultLocale(supportedLocales[0] ?? locale);
  }, [defaultLocale, locale, supportedLocales]);

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
  }, [selectedNode.id]);

  const saveNowRef = useRef(autosave.saveNow);

  useEffect(() => {
    saveNowRef.current = autosave.saveNow;
  }, [autosave.saveNow]);

  useEffect(() => {
    return () => {
      saveNowRef.current();
    };
  }, []);

  const setDraftSnapshot = useCallback((snapshot: DraftEditorSnapshot) => {
    setDraftSnapshotState((currentSnapshot) => {
      if (JSON.stringify(currentSnapshot) === JSON.stringify(snapshot)) {
        return currentSnapshot;
      }

      return snapshot;
    });
  }, []);

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
                  initialDraftSnapshot,
                  initialDraftSnapshotLoaded,
                  localizedCourse,
                  selectedNode,
                  setContentRating,
                  setDefaultLocale,
                  setLocalizedCourse,
                  setDraftSnapshot,
                  setEditorStatusAction,
                  setSelectedNode,
                  setSupportedLocales,
                  supportedLocales,
                  versionBadge: courseDetailsQuery.data?.versionBadge,
                } satisfies CourseLayoutOutletContext
              }
            />
          </div>
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20">
            <div className="pointer-events-auto md:pl-(--sidebar-width)">
              <EditorStatusBar
                action={editorStatusAction}
                message={
                  draftEditorRecordQuery.isLoading
                    ? "Loading draft…"
                    : autosave.status === "dirty"
                      ? "Saving soon…"
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
    <Sidebar collapsible="offcanvas">
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
