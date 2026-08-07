import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useParams } from "react-router-dom";

import { CourseStructurePrototype } from "@/components/course-structure-prototype/course-structure-prototype";
import { EditorPrototype } from "@/components/editor-prototype/editor-prototype";

export function DraftDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { t } = useTranslation();

  if (!courseId) {
    return <Navigate replace to="/drafts" />;
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-5 lg:h-[calc(100vh-4rem)] lg:overflow-hidden lg:p-6">
      <div className="space-y-3 border-b border-stone-200 pb-5">
        <Link
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
          to="/drafts"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          {t("draftDetails.back")}
        </Link>
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Draft workspace
          </p>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
                Prototype draft editor
              </h1>
              <p className="max-w-3xl text-sm text-stone-600">
                Explore a full-width authoring workspace with course structure on
                the left and the lesson editor on the right.
              </p>
            </div>
            <p className="text-sm text-stone-500">Course ID: {courseId}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
        <section className="lg:min-h-0 lg:overflow-auto">
          <CourseStructurePrototype compact />
        </section>
        <section className="lg:min-h-0 lg:overflow-auto">
          <EditorPrototype />
        </section>
      </div>
    </div>
  );
}
