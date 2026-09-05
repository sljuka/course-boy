export type ShareCourseInput = {
  courseId: string
  version?: string
}

export type ShareCourseResult = {
  code: string
}

export type ImportCourseInput = {
  code: string
}

export type ImportCourseResult = {
  courseId: string
}
