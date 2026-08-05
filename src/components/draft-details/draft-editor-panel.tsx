import { FileText, PencilLine, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { CourseSectionPreview } from "@/lib/course-package";
import { DraftSectionCreateForm } from "@/components/draft-details/draft-section-create-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

export function DraftEditorPanel({
  activeSection,
  isCreatingSection,
  isPending,
  onCancelCreateSection,
  onOpenCreateSection,
  onSubmitCreateSection,
}: {
  activeSection: CourseSectionPreview | null;
  isCreatingSection: boolean;
  isPending: boolean;
  onCancelCreateSection: () => void;
  onOpenCreateSection: () => void;
  onSubmitCreateSection: (input: { description: string; title: string }) => void;
}) {
  const { t } = useTranslation();

  return (
    <Card className="xl:flex-[1.4]" variant="dashed">
      <CardHeader
        subtitle={
          <CardDescription className="max-w-2xl">
            {isCreatingSection
              ? t("draftDetails.createSection.description")
              : t("draftDetails.editor.description")}
          </CardDescription>
        }
        title={
          <div className="flex items-center gap-2 text-stone-950">
            <FileText aria-hidden="true" className="h-5 w-5" />
            <span className="text-lg font-semibold">
              {isCreatingSection
                ? t("draftDetails.createSection.title")
                : activeSection
                  ? activeSection.title
                  : t("draftDetails.editor.emptyTitle")}
            </span>
          </div>
        }
      />
      <CardContent className="gap-4">
        {isCreatingSection ? (
          <DraftSectionCreateForm
            isPending={isPending}
            onCancel={onCancelCreateSection}
            onSubmit={onSubmitCreateSection}
          />
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <div className="text-sm font-semibold text-stone-950">
                {activeSection
                  ? t("draftDetails.editor.selectedTitle")
                  : t("draftDetails.editor.nextStepTitle")}
              </div>
              <CardDescription>
                {activeSection
                  ? activeSection.description ||
                    t("draftDetails.editor.selectedDescription")
                  : t("draftDetails.editor.nextStepEmpty")}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button className="gap-2" onClick={onOpenCreateSection} size="lg">
                <Plus aria-hidden="true" className="h-4 w-4" />
                {t("draftDetails.actions.addSection")}
              </Button>
              <Button className="gap-2" disabled size="lg" variant="secondary">
                <PencilLine aria-hidden="true" className="h-4 w-4" />
                {t("draftDetails.actions.editCourse")}
              </Button>
            </div>
            <Card variant="muted">
              <CardContent className="gap-2">
                <div className="text-sm font-semibold text-stone-950">
                  {activeSection
                    ? t("draftDetails.editor.sectionNextTitle")
                    : t("draftDetails.editor.helperTitle")}
                </div>
                <CardDescription>
                  {activeSection
                    ? t("draftDetails.editor.sectionNextDescription")
                    : t("draftDetails.editor.helperDescription")}
                </CardDescription>
              </CardContent>
            </Card>
          </>
        )}
      </CardContent>
    </Card>
  );
}
