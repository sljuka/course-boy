import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CourseSearchField } from "@/components/course-search/course-search-field";
import { HomeCourseList } from "@/components/home/home-course-list";
import { HomeProgramList } from "@/components/home/home-program-list";
import type { CourseListView } from "@/lib/course-list-view";
import { useShowBundledCourses } from "@/lib/show-bundled-courses-queries";

// Programs imported with a code, then courses to learn from: anything imported (or being imported) and the
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
      <HomeProgramList kind="channel" query={query} />
      <HomeProgramList query={query} />
      <HomeCourseList query={query} showBundledCourses={showBundledCourses} view={view} />
    </>
  );
};
