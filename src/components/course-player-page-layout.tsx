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
    <main className="min-h-screen bg-white print:min-h-0 print:bg-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 print:min-h-0 print:max-w-none print:px-0 print:py-0">
        <ErrorBoundary
          fallback={<CourseErrorCard message={t("courseDetails.error")} />}
          key={`${playerKey}-${locale}`}
        >
          <div className="page-fade-in flex flex-col gap-4 print:block">
            {children}
          </div>
        </ErrorBoundary>
      </div>
    </main>
  );
}
