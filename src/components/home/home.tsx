import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CourseList } from "@/components/course-search/course-list";
import { CourseSearchField } from "@/components/course-search/course-search-field";

export const Home = () => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  return (
    <>
      <CourseSearchField
        onChange={setQuery}
        placeholder={t("courseSearch.placeholder")}
        value={query}
      />
      <CourseList distribution="bundled" query={query} />
    </>
  );
};
