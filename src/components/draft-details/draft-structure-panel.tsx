import { FolderTree } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { CourseSectionPreview } from "@/lib/course-package";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

export function DraftStructurePanel({
  sections,
}: {
  sections: CourseSectionPreview[];
}) {
  const { t } = useTranslation();

  return (
    <Card className="xl:max-w-sm xl:flex-1" variant="muted">
      <CardHeader
        subtitle={
          <CardDescription>
            {t("draftDetails.structure.description")}
          </CardDescription>
        }
        title={
          <div className="flex items-center gap-2 text-stone-950">
            <FolderTree aria-hidden="true" className="h-5 w-5" />
            <span className="text-lg font-semibold">
              {t("draftDetails.structure.title")}
            </span>
          </div>
        }
      />
      <CardContent>
        {sections.length === 0 ? (
          <Card variant="dashed">
            <CardContent className="gap-2">
              <div className="text-sm font-semibold text-stone-950">
                {t("draftDetails.structure.emptyTitle")}
              </div>
              <CardDescription>
                {t("draftDetails.structure.emptyDescription")}
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          sections.map((section, index) => (
            <Card key={section.id} variant="dashed">
              <CardContent className="gap-2">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  {t("draftDetails.structure.sectionLabel", {
                    index: index + 1,
                  })}
                </div>
                <div className="text-base font-semibold text-stone-950">
                  {section.title}
                </div>
                {section.description && (
                  <CardDescription>{section.description}</CardDescription>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
}
