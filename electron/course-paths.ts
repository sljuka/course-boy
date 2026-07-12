import path from "node:path";

export function getLocalCoursesRoot(): string {
  return path.join(process.env.APP_ROOT, "courses");
}
