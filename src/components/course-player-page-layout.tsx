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
    <main className="min-h-screen bg-stone-100/80">
      <div className="page-fade-in mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4">
        <ErrorBoundary
          fallback={<CourseErrorCard message={t("courseDetails.error")} />}
          key={`${playerKey}-${locale}`}
        >
          {children}
        </ErrorBoundary>
      </div>
    </main>
  );
}
