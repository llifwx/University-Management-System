import { APIRequestContext, expect, test } from "@playwright/test";

import { accounts, apiAs, createSection, semesterByName, signIn } from "./helpers";

test.describe("course registration", () => {
  let admin: APIRequestContext;
  let fallId: number;
  const base = () => process.env.E2E_BASE_URL ?? "http://localhost:3000";

  test.beforeAll(async () => {
    admin = await apiAs(base(), accounts.admin());
    fallId = (await semesterByName(admin, "Fall 2026")).semester_id;
  });
  test.afterAll(() => admin.dispose());

  test("catalog search leads to registering, which updates the timetable and My courses, and can be cancelled", async ({ page }) => {
    const { course } = await createSection(admin, fallId, { meetings: [{ meeting_day: 5, start_time: "08:00", end_time: "09:00" }] });
    await signIn(page, accounts.student(3));

    await page.getByRole("link", { name: "Course catalog" }).click();
    await page.getByLabel("Search").fill(course.course_code);
    await page.getByRole("link", { name: course.course_title }).click();
    await expect(page.getByRole("heading", { name: course.course_title })).toBeVisible();
    await expect(page.getByText("10 of 10 seats remaining")).toBeVisible();

    await page.getByRole("button", { name: "Register" }).click();
    await expect(page.getByText("You are registered for this section.")).toBeVisible();
    // Query invalidation: seat count and badge update with no reload.
    await expect(page.getByText("9 of 10 seats remaining")).toBeVisible();
    await expect(page.getByText("Enrolled", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Register" })).toHaveCount(0);

    await page.getByRole("link", { name: "Schedule" }).click();
    await expect(page.getByTestId("week-grid").getByRole("button", { name: new RegExp(course.course_code) })).toBeVisible();

    await page.getByRole("link", { name: "My courses" }).click();
    const row = page.getByRole("row").filter({ hasText: course.course_code });
    await expect(row).toContainText("Enrolled");
    await row.getByRole("button", { name: "Cancel registration" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Cancel registration" }).click();
    await expect(row).toContainText("Cancelled");
    await expect(row.getByRole("button", { name: "Cancel registration" })).toHaveCount(0);

    await page.getByLabel("Status").selectOption("Enrolled");
    await expect(page.getByRole("row").filter({ hasText: course.course_code })).toHaveCount(0);

    await page.getByRole("link", { name: "Schedule" }).click();
    await expect(page.getByRole("heading", { name: "Weekly schedule" })).toBeVisible();
    await expect(page.getByRole("button", { name: new RegExp(course.course_code) })).toHaveCount(0);
  });

  test("the backend's schedule conflict is shown, and no registration is created", async ({ page }) => {
    // Two admin-made sections at the same time, so this does not rely on seeded enrollments.
    const meetings = [{ meeting_day: 6, start_time: "10:00", end_time: "11:30" }];
    const first = await createSection(admin, fallId, { meetings });
    await new Promise((resolve) => setTimeout(resolve, 5)); // uniqueId has millisecond resolution.
    const second = await createSection(admin, fallId, { meetings });

    await signIn(page, accounts.student(4));
    await page.goto(`/courses/${first.course.course_id}`);
    await page.getByRole("button", { name: "Register" }).click();
    await expect(page.getByText("You are registered for this section.")).toBeVisible();

    await page.goto(`/courses/${second.course.course_id}`);
    await page.getByRole("button", { name: "Register" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "overlaps" })).toHaveText("This section overlaps with an existing class in your schedule.");
    await expect(page.getByText("10 of 10 seats remaining")).toBeVisible();
  });

  test("a stale page racing for the last seat gets the backend's full-section error", async ({ page }) => {
    const { course, section } = await createSection(admin, fallId, { capacity: 1, meetings: [{ meeting_day: 6, start_time: "20:00", end_time: "21:00" }] });
    await signIn(page, accounts.student(2));
    await page.goto(`/courses/${course.course_id}`);
    await expect(page.getByText("1 of 1 seats remaining")).toBeVisible();

    const rival = await apiAs(base(), accounts.student(3));
    const taken = await rival.post("/api/proxy/registrations", { data: { section_id: section.section_id, semester_id: fallId } });
    expect(taken.status()).toBe(201);
    await rival.dispose();

    await page.getByRole("button", { name: "Register" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "full" })).toContainText("This section is full");
    // The failure refreshed the stale count, which now disables the action.
    await expect(page.getByRole("button", { name: "Section full" })).toBeDisabled();
  });

  test("a duplicate request is refused by the backend", async ({ page }) => {
    const { course, section } = await createSection(admin, fallId, { meetings: [{ meeting_day: 6, start_time: "07:00", end_time: "07:30" }] });
    await signIn(page, accounts.student(2));
    await page.goto(`/courses/${course.course_id}`);
    await expect(page.getByRole("button", { name: "Register" })).toBeVisible();

    // A second tab registers first; this tab has not seen it yet.
    const origin = new URL(page.url()).origin;
    const taken = await page.request.post("/api/proxy/registrations", { data: { section_id: section.section_id, semester_id: fallId }, headers: { Origin: origin } });
    expect(taken.status()).toBe(201);
    await page.getByRole("button", { name: "Register" }).click();
    await expect(page.getByText("You are already enrolled in this section.")).toBeVisible();
    await expect(page.getByText("Enrolled", { exact: true })).toBeVisible();
  });

  test("a closed semester blocks registration in the UI and at the backend", async ({ page }) => {
    const id = Date.now();
    const semester = (await (await admin.post("/api/proxy/semesters", { data: { name: `Closed ${id}`, start_date: "2030-01-01", end_date: "2030-06-01", is_active: false } })).json()) as { semester_id: number };
    const { course, section } = await createSection(admin, semester.semester_id, { meetings: [{ meeting_day: 0, start_time: "08:00", end_time: "09:00" }] });
    await signIn(page, accounts.student(2));
    await page.goto(`/courses/${course.course_id}?semester=all`);
    await expect(page.getByText("Registration closed")).toBeVisible();
    await expect(page.getByRole("button", { name: "Register" })).toBeDisabled();
    const direct = await page.request.post("/api/proxy/registrations", { data: { section_id: section.section_id, semester_id: semester.semester_id }, headers: { Origin: new URL(page.url()).origin } });
    expect(direct.status()).toBe(409);
    expect((await direct.json()).error.code).toBe("REGISTRATION_CLOSED");
  });
});
