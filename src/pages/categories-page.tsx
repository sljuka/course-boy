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
import { categories } from "@/lib/categories";
import type { Category } from "@/lib/preferences";
import { useAppState } from "@/lib/use-app-state";

const categoryRoutes: Partial<Record<Category, string>> = {
  "high-school": "/high-school",
  other: "/other",
  "pre-school": "/pre-school",
};

const categoryIcons: Record<Category, string> = {
  "elementary-school": "📘",
  "high-school": "🎓",
  other: "✨",
  "pre-school": "🧸",
};

export const CategoriesPage = () => {
  const { category, setCategory } = useAppState();
  const { t } = useTranslation();

  return (
    <Card className="mx-auto w-full max-w-2xl overflow-hidden">
      <CardHeader>
        <CardTitle className="text-xl">{t("categoryTitle")}</CardTitle>
        <CardDescription>{t("categorySubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-3 sm:grid-cols-2">
          {categories.map((categoryOption) => (
            <Link
              className={buttonVariants({
                appearance: "squareTile",
                size: "lg",
                variant: category === categoryOption ? "default" : "secondary",
              })}
              to={categoryRoutes[categoryOption] ?? "/"}
              key={categoryOption}
              onClick={() => setCategory(categoryOption)}
            >
              <span className="text-5xl leading-none">
                {categoryIcons[categoryOption]}
              </span>
              <span>
                {t(
                  `categories.${categoryOption.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())}`,
                ).replace(/^[^\p{L}\p{N}]+\s*/u, "")}
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
