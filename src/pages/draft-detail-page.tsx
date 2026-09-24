import { useEffect } from "react";
import { Navigate, useOutletContext, useParams } from "react-router-dom";

import { CourseMetadataEditor } from "@/components/draft-details/course-metadata-editor";
import { DraftDocumentEditor } from "@/components/draft-details/draft-document-editor";
import { DraftSectionEditor } from "@/components/draft-details/draft-section-editor";
import { DraftTestEditor } from "@/components/draft-details/draft-test-editor";
import { courseRootId } from "@/components/course-structure-prototype/course-structure-prototype-types";
import type { CourseLayoutOutletContext } from "@/components/course-layout";
import { PageContent } from "@/components/page-content";
import { useAppState } from "@/lib/use-app-state";

export function DraftDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { locale: appLocale } = useAppState();
  const {
    contentRating,
    courseDescriptiveTags,
    courseSections,
    defaultLocale,
    isCourseDetailsLoading,
    localizedCourse,
    reportAutosaveStatus,
    selectedNode,
    setEditorStatusAction,
    setSelectedNode,
    supportedLocales,
    versionBadge,
  } = useOutletContext<CourseLayoutOutletContext>();

  useEffect(() => {
    setEditorStatusAction(null);
  }, [setEditorStatusAction]);

  if (!courseId) {
    return <Navigate replace to="/my-courses" />;
  }

  if (isCourseDetailsLoading) {
    return <PageContent>{null}</PageContent>;
  }

  if (selectedNode.id === courseRootId) {
    return (
      <CourseMetadataEditor
        contentRating={contentRating}
        courseId={courseId}
        courseSections={courseSections}
        defaultLocale={defaultLocale}
        descriptiveTags={courseDescriptiveTags}
        localizedCourse={localizedCourse}
        reportAutosaveStatus={reportAutosaveStatus}
        supportedLocales={supportedLocales}
        versionBadge={versionBadge}
      />
    );
  }

  if (selectedNode.type === "test") {
    return (
      <DraftTestEditor
        key={selectedNode.id}
        courseId={courseId}
        courseSections={courseSections}
        descriptiveTags={courseDescriptiveTags}
        reportAutosaveStatus={reportAutosaveStatus}
        selectedNode={selectedNode}
        supportedLocales={supportedLocales}
      />
    );
  }

  if (selectedNode.type === "section") {
    const section = courseSections.find((candidate) => candidate.id === selectedNode.id);

    return (
      <DraftSectionEditor
        key={selectedNode.id}
        courseId={courseId}
        defaultLocale={defaultLocale}
        reportAutosaveStatus={reportAutosaveStatus}
        section={section}
        selectedNode={selectedNode}
        setSelectedNode={setSelectedNode}
        supportedLocales={supportedLocales}
      />
    );
  }

  const documentSection = courseSections.find((section) =>
    section.lessons.some((lesson) => lesson.id === selectedNode.id),
  );
  const lesson = documentSection?.lessons.find((candidate) => candidate.id === selectedNode.id);

  if (!documentSection || !lesson) {
    return <PageContent>{null}</PageContent>;
  }

  return (
    <DraftDocumentEditor
      key={selectedNode.id}
      appLocale={appLocale}
      courseId={courseId}
      lesson={lesson}
      reportAutosaveStatus={reportAutosaveStatus}
      sectionId={documentSection.id}
      selectedNode={selectedNode}
      supportedLocales={supportedLocales}
    />
  );
}
