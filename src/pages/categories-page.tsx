import { Star } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { courses } from "@/lib/categories";
import { useAppState } from "@/lib/use-app-state";

export const CategoriesPage = () => {
  const { category, setCategory } = useAppState();
  const { t } = useTranslation();
  const [favoriteCourses, setFavoriteCourses] = useState<Record<string, boolean>>(
    {},
  );

  const toggleFavoriteCourse = (courseKey: string) => {
    setFavoriteCourses((currentFavorites) => ({
      ...currentFavorites,
      [courseKey]: !currentFavorites[courseKey],
    }));
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <div className="px-2 py-1">
        <CardTitle className="text-3xl sm:text-4xl">{t("coursesTitle")}</CardTitle>
        <CardDescription className="mt-3 max-w-2xl text-base text-stone-700">
          {t("coursesSubtitle")}
        </CardDescription>
      </div>
      <div className="grid gap-5">
        {courses.map((course) => (
          <Card className="overflow-hidden" key={course.key}>
            <CardHeader className="pb-3">
              {(() => {
                const isFavorite = Boolean(favoriteCourses[course.key]);

                return (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="text-4xl leading-none">{course.icon}</div>
                      <CardTitle className="text-2xl">{t(`courses.${course.key}`)}</CardTitle>
                    </div>
                    <button
                      aria-label={
                        isFavorite
                          ? t("removeFavoriteCourse")
                          : t("favoriteCourse")
                      }
                      aria-pressed={isFavorite}
                      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        isFavorite
                          ? "border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-200"
                          : "border-stone-200 bg-white/80 text-stone-700 hover:bg-stone-50"
                      }`}
                      onClick={() => toggleFavoriteCourse(course.key)}
                      type="button"
                    >
                      <Star
                        className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`}
                      />
                    </button>
                  </div>
                );
              })()}
              <CardDescription>
                {t(`courseDescriptions.${course.descriptionKey}`)}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="-mx-2 overflow-x-auto px-2 pb-2">
                <div className="flex min-w-max gap-4 xl:min-w-0 xl:justify-between">
                  {course.items.slice(0, 6).map((item) => (
                    <div className="flex flex-col items-center gap-2" key={item.key}>
                      <Link
                        className={buttonVariants({
                          appearance: "squareTileMd",
                          variant:
                            category === item.category ? "default" : "secondary",
                        })}
                        onClick={() => setCategory(item.category)}
                        to={item.path}
                      >
                        <span className="text-5xl leading-none">{item.icon}</span>
                      </Link>
                      <span className="max-w-32 text-center text-sm font-semibold text-stone-900">
                        {t(`courseItems.${item.key}.title`)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
