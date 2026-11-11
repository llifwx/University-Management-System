/** Teachers without a profile name yet fall back to their id; /users is admin-only. */
export function instructorLabel({ teacher_id, teacher_name }: { teacher_id: number | null; teacher_name?: string | null }): string {
  if (teacher_id === null) return "Unassigned";
  return teacher_name ?? `Instructor #${teacher_id}`;
}
