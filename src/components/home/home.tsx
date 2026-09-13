import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CourseList } from "@/components/course-search/course-list";
import { CourseSearchField } from "@/components/course-search/course-search-field";
import { PageHeader } from "@/components/page-header";
import { CardDescription, CardTitle } from "@/components/ui/card";

type HomeProps = {
  actions?: ReactNode;
};

export const Home = ({ actions }: HomeProps) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  return (
    <>
      <PageHeader
        right={actions}
        subtitle={
          <CardDescription className="max-w-3xl">
            {t("courseSearch.subtitle")}
          </CardDescription>
        }
        title={
          <CardTitle size="lg">
            {t("courseSearch.title")}
          </CardTitle>
        }
      />
      <CourseSearchField
        onChange={setQuery}
        placeholder={t("courseSearch.placeholder")}
        value={query}
      />
      <CourseList distribution="bundled" query={query} />
    </>
  );
};
