import { useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppState } from "@/lib/use-app-state";

const subjects = [
  {
    icon: "🔢",
    key: "numbersTo20",
    path: "/elementary-school/numbers-to-20",
  },
  {
    icon: "➕",
    key: "additionAndSubtraction",
    path: "/elementary-school/addition-and-subtraction",
  },
  {
    icon: "📏",
    key: "shapesAndMeasurement",
    path: "/elementary-school/shapes-and-measurement",
  },
] as const;

export const ElementarySchoolPage = () => {
  const { category, role, setCategory } = useAppState();
  const { t } = useTranslation();

  useEffect(() => {
    if (category !== "elementary-school") {
      setCategory("elementary-school");
    }
  }, [category, setCategory]);

  if (role !== "student") {
    return <Navigate replace to={role === "teacher" ? "/teacher" : "/"} />;
  }

  return (
    <Card className="mx-auto w-full max-w-2xl overflow-hidden">
      <CardHeader>
        <CardTitle className="text-xl">{t("elementarySchool.title")}</CardTitle>
        <CardDescription>{t("elementarySchool.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-3 sm:grid-cols-2">
          {subjects.map((subject) => (
            <Link
              className={buttonVariants({
                appearance: "squareTile",
                size: "lg",
                variant: "secondary",
              })}
              key={subject.key}
              to={subject.path}
            >
              <span className="text-5xl leading-none">{subject.icon}</span>
              <span>{t(`elementarySchool.subjects.${subject.key}`)}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
