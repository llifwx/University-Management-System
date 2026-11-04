/** The API exposes only a teacher id to non-admins: accounts have no display name and /users is admin-only. */
export function instructorLabel(teacherId: number | null): string {
  return teacherId === null ? "Unassigned" : `Instructor #${teacherId}`;
}
