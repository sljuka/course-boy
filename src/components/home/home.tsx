import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CourseList } from "@/components/course-search/course-list";
import { CourseSearchField } from "@/components/course-search/course-search-field";

// Courses to learn from: the bundled tutorial and anything imported.
const learningDistributions = ["bundled", "imported"] as const;

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
      <CourseList distributions={learningDistributions} query={query} />
    </>
  );
};
