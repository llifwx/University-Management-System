import type { Course } from "../model/types";

/** The backend has no course search parameter, so this runs over the complete list. */
export function searchCourses(courses: Course[], term: string): Course[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return courses;
  return courses.filter((c) => c.course_code.toLowerCase().includes(needle) || c.course_title.toLowerCase().includes(needle));
}
