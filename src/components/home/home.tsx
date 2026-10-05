import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CourseSearchField } from "@/components/course-search/course-search-field";
import { HomeCourseList } from "@/components/home/home-course-list";
import type { CourseListView } from "@/lib/course-list-view";
import { useShowBundledCourses } from "@/lib/show-bundled-courses-queries";

// Courses to learn from: anything imported (or being imported) and the
// bundled tutorial (unless hidden in Settings).
export const Home = ({ view }: { view: CourseListView }) => {
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
      <HomeCourseList query={query} showBundledCourses={showBundledCourses} view={view} />
    </>
  );
};
