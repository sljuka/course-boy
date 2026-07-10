import { useEffect } from "react";
import { Navigate } from "react-router-dom";

import { InDevelopment } from "@/components/in-development";
import { useAppState } from "@/lib/use-app-state";

export const ElementarySubjectPage = () => {
  const { category, role, setCategory } = useAppState();

  useEffect(() => {
    if (category !== "elementary-school") {
      setCategory("elementary-school");
    }
  }, [category, setCategory]);

  if (role !== "student") {
    return <Navigate replace to={role === "teacher" ? "/teacher" : "/"} />;
  }

  return <InDevelopment fallbackPath="/elementary-school" />;
};
