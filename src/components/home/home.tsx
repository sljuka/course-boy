import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CourseList } from "@/components/course-search/course-list";
import { CourseSearchField } from "@/components/course-search/course-search-field";
import { useShowBundledCourses } from "@/lib/show-bundled-courses-queries";

// Courses to learn from: the bundled tutorial (unless hidden in Settings) and
// anything imported.
const learningDistributions = ["bundled", "imported"] as const;
const importedOnly = ["imported"] as const;

export const Home = () => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [showBundledCourses] = useShowBundledCourses();

  return (
    <>
      <CourseSearchField
        onChange={setQuery}
        placeholder={t("courseSearch.placeholder")}
        value={query}
      />
      <CourseList
        distributions={showBundledCourses ? learningDistributions : importedOnly}
        query={query}
      />
    </>
  );
};
