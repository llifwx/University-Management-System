import { APIRequestContext, expect, test } from "@playwright/test";

import { accounts, apiAs, createSection, semesterByName, signIn } from "./helpers";

test.describe("weekly timetable", () => {
  let admin: APIRequestContext;
  let student: APIRequestContext;
  let courseCode: string;
  let fallId: number;
  let springId: number;

  test.beforeAll(async () => {
    const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
    admin = await apiAs(base, accounts.admin());
    student = await apiAs(base, accounts.student(1));
    fallId = (await semesterByName(admin, "Fall 2026")).semester_id;
    springId = (await semesterByName(admin, "Spring 2027")).semester_id;
    const { course, section } = await createSection(admin, fallId, {
      meetings: [
        { meeting_day: 0, start_time: "15:00", end_time: "16:00" },
        { meeting_day: 2, start_time: "15:00", end_time: "16:00" },
      ],
    });
    courseCode = course.course_code;
    const registered = await student.post("/api/proxy/registrations", { data: { section_id: section.section_id, semester_id: fallId } });
    expect(registered.status()).toBe(201);
  });
  test.afterAll(async () => {
    await admin.dispose();
    await student.dispose();
  });

  test("one section meeting twice a week appears on both days, positioned by time", async ({ page }) => {
    await signIn(page, accounts.student(1));
    await page.goto(`/schedule?semester=${fallId}`);
    const grid = page.getByTestId("week-grid");
    const monday = grid.locator('[data-day="Monday"]').getByRole("button", { name: new RegExp(courseCode) });
    const wednesday = grid.locator('[data-day="Wednesday"]').getByRole("button", { name: new RegExp(courseCode) });
    await expect(monday).toBeVisible();
    await expect(wednesday).toBeVisible();
    await expect(grid.locator('[data-day="Tuesday"]').getByRole("button", { name: new RegExp(courseCode) })).toHaveCount(0);
    expect((await monday.boundingBox())!.y).toBe((await wednesday.boundingBox())!.y);

    await wednesday.click();
    await expect(page.getByRole("dialog")).toContainText("Wednesday 15:00–16:00");
  });

  test("the semester selector switches to a different, empty timetable", async ({ page }) => {
    await signIn(page, accounts.student(1));
    await page.goto(`/schedule?semester=${fallId}`);
    await expect(page.getByTestId("week-grid").getByRole("button", { name: new RegExp(courseCode) }).first()).toBeVisible();
    await page.getByLabel("Semester").selectOption(String(springId));
    await expect(page).toHaveURL(new RegExp(`semester=${springId}`));
    await expect(page.getByText("Nothing on the timetable")).toBeVisible();
  });

  test("phones get a day view without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, accounts.student(1));
    await page.goto(`/schedule?semester=${fallId}`);
    await expect(page.getByTestId("week-grid")).toBeHidden();
    const dayView = page.getByTestId("day-view");
    await dayView.getByRole("button", { name: "Monday" }).click();
    await expect(dayView.getByText(new RegExp(courseCode))).toBeVisible();
    await dayView.getByRole("button", { name: "Tuesday" }).click();
    await expect(dayView.getByText(new RegExp(courseCode))).toHaveCount(0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
