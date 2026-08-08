import { useState } from "react";
import { ArrowLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Link, Outlet } from "react-router-dom";

import { CourseStructurePrototype } from "@/components/course-structure-prototype/course-structure-prototype";
import {
  courseRootId,
  type StructureSelection,
} from "@/components/course-structure-prototype/course-structure-prototype-types";
import { OnboardingGuard } from "@/components/onboarding-guard";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/use-app-state";
import type { Locale } from "@/lib/i18n";

type ContentRating = "all-ages" | "mature-themes" | "explicit";

type CourseLayoutOutletContext = {
  contentRating: ContentRating;
  courseDescription: string;
  courseTitle: string;
  selectedNode: StructureSelection;
  setContentRating: (contentRating: ContentRating) => void;
  setCourseDescription: (description: string) => void;
  setCourseTitle: (title: string) => void;
  setSelectedNode: (selection: StructureSelection) => void;
  setSupportedLocales: (locales: Locale[]) => void;
  supportedLocales: Locale[];
};

export type { ContentRating, CourseLayoutOutletContext };

export const CourseLayout = () => {
  const { locale } = useAppState();
  const [contentRating, setContentRating] = useState<ContentRating>("all-ages");
  const [courseTitle, setCourseTitle] = useState("Course");
  const [courseDescription, setCourseDescription] = useState("");
  const [supportedLocales, setSupportedLocales] = useState<Locale[]>([locale]);
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<StructureSelection>({
    id: courseRootId,
    title: "Course",
    type: "course",
  });

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
            <p className="px-1 pb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
              Explorer
            </p>
            <CourseStructurePrototype
              compact
              courseTitle={courseTitle || "Course"}
              onSelectionChange={handleSelectionChange}
              selectedNodeId={selectedNode.id}
              showFrameHeader={false}
            />
          </div>
        </aside>
        <main className="relative min-w-0 flex-1 overflow-auto bg-white">
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
          <Outlet
            context={
              {
                contentRating,
                courseDescription,
                courseTitle,
                selectedNode,
                setContentRating,
                setCourseDescription,
                setCourseTitle,
                setSelectedNode,
                setSupportedLocales,
                supportedLocales,
              } satisfies CourseLayoutOutletContext
            }
          />
        </main>
      </div>
    </OnboardingGuard>
  );
};
