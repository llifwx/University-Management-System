import { expect, test } from "@playwright/test";

import { accounts, apiAs, create, semesterByName, signIn, uniqueId } from "./helpers";

test("a teacher sees assigned sections, a roster without emails and a schedule, and is refused other sections", async ({ page }) => {
  const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
  const admin = await apiAs(base, accounts.admin());
  const student = await apiAs(base, accounts.student(2));
  const fallId = (await semesterByName(admin, "Fall 2026")).semester_id;
  const users = await (await admin.get("/api/proxy/users?limit=100")).json();
  const teacherId = users.items.find((user: { email: string }) => user.email === accounts.teacher(2).email).id;

  const id = uniqueId();
  const course = await create<{ course_id: number; course_code: string }>(admin, "/courses", { course_code: `T${id}`, course_title: `Taught ${id}`, credits: 3 });
  const section = await create<{ section_id: number }>(admin, "/sections", {
    course_id: course.course_id,
    semester_id: fallId,
    section_number: "A",
    capacity: 5,
    teacher_id: teacherId,
    meetings: [{ meeting_day: 3, start_time: "06:00", end_time: "07:00" }],
  });
  const other = await create<{ section_id: number }>(admin, "/sections", {
    course_id: course.course_id,
    semester_id: fallId,
    section_number: "B",
    capacity: 5,
    meetings: [{ meeting_day: 3, start_time: "06:00", end_time: "07:00" }],
  });
  expect((await student.post("/api/proxy/registrations", { data: { section_id: section.section_id, semester_id: fallId } })).status()).toBe(201);
  await admin.dispose();
  await student.dispose();

  await signIn(page, accounts.teacher(2));
  const row = page.getByRole("row").filter({ hasText: course.course_code });
  await expect(row).toContainText("1 / 5");
  await row.getByRole("link", { name: new RegExp(course.course_code) }).click();
  await expect(page.getByRole("heading", { name: new RegExp(`${course.course_code} · Section A`) })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Sam Rivera" })).toBeVisible();
  await expect(page.locator("main")).not.toContainText("student2@demo.example.edu");

  await page.getByRole("link", { name: "Teaching schedule" }).click();
  await expect(page.getByTestId("week-grid").getByRole("button", { name: new RegExp(course.course_code) })).toBeVisible();

  const denied = await page.request.get(`/api/proxy/sections/${other.section_id}/enrollments`);
  expect(denied.status()).toBe(403);
  await page.goto(`/teacher/sections/${other.section_id}`);
  await expect(page.getByText("Section is assigned to another teacher.")).toBeVisible();
});
