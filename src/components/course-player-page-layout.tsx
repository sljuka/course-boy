import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { CourseErrorCard } from "@/components/course-error-card";
import { ErrorBoundary } from "@/components/error-boundary";
import { useAppState } from "@/lib/use-app-state";

export function CoursePlayerPageLayout({
  children,
  playerKey,
}: {
  children: ReactNode;
  playerKey: string;
}) {
  const { locale } = useAppState();
  const { t } = useTranslation();

  return (
    // Players render their own `<Page>` (toolbar + scrolling body) inside the
    // layout's panel; this only adds the error boundary and fade-in.
    <main className="flex min-h-0 flex-1 flex-col print:block">
        <ErrorBoundary
          fallback={<CourseErrorCard message={t("courseDetails.error")} />}
          key={`${playerKey}-${locale}`}
        >
          <div className="page-fade-in flex min-h-0 flex-1 flex-col print:block">
            {children}
          </div>
        </ErrorBoundary>
    </main>
  );
}
