import { APIRequestContext, expect, test } from "@playwright/test";

import { accounts, apiAs, createSection, semesterByName, signIn, uniqueId } from "./helpers";

test.describe("administration", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, accounts.admin());
  });

  test("the overview shows live totals and charts", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Administration" })).toBeVisible();
    await expect(page.getByText("Registrations by status").first()).toBeVisible();
    await expect(page.locator(".recharts-surface").first()).toBeVisible();
    const students = await (await page.request.get("/api/proxy/students?limit=1")).json();
    await expect(page.getByText("Students", { exact: true }).locator("xpath=following-sibling::p")).toHaveText(String(students.total));
  });

  test("courses: validation, create, duplicate refusal, edit, delete", async ({ page }) => {
    const code = `UI${uniqueId()}`;
    await page.goto("/admin/courses");
    await page.getByRole("button", { name: "Add course" }).click();
    let dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Create course" }).click();
    await expect(dialog.getByText("Enter a course code.")).toBeVisible();

    await dialog.getByLabel("Course code").fill(code);
    await dialog.getByLabel("Title").fill("UI course");
    await dialog.getByLabel("Credits").fill("3");
    await dialog.getByRole("button", { name: "Create course" }).click();
    await expect(dialog).toBeHidden();

    await page.getByRole("button", { name: "Add course" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Course code").fill(code);
    await dialog.getByLabel("Title").fill("Duplicate");
    await dialog.getByLabel("Credits").fill("3");
    await dialog.getByRole("button", { name: "Create course" }).click();
    await expect(dialog.getByRole("alert")).toContainText("already exists");
    await page.keyboard.press("Escape");

    await page.getByLabel("Search").fill(code);
    const row = page.getByRole("row").filter({ hasText: code });
    await row.getByRole("button", { name: "Edit" }).click();
    await page.getByRole("dialog").getByLabel("Title").fill("UI course renamed");
    await page.getByRole("dialog").getByRole("button", { name: "Save changes" }).click();
    await expect(row).toContainText("UI course renamed");

    await row.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete course" }).click();
    await expect(row).toHaveCount(0);
  });

  test("deleting a course with sections shows the refusal", async ({ page }) => {
    const admin = await apiAs(new URL(page.url()).origin, accounts.admin());
    const fall = await semesterByName(admin, "Fall 2026");
    const { course } = await createSection(admin, fall.semester_id, { meetings: [{ meeting_day: 0, start_time: "06:00", end_time: "07:00" }] });
    await admin.dispose();
    await page.goto("/admin/courses");
    await page.getByLabel("Search").fill(course.course_code);
    await page.getByRole("row").filter({ hasText: course.course_code }).getByRole("button", { name: "Delete" }).click();
    const dialog = page.getByRole("alertdialog");
    await dialog.getByRole("button", { name: "Delete course" }).click();
    await expect(dialog.getByRole("alert")).toContainText("still has sections");
  });

  test("semesters: create, toggle, reject bad dates", async ({ page }) => {
    const name = `Term ${uniqueId()}`;
    await page.goto("/admin/semesters");
    await page.getByRole("button", { name: "Add semester" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill(name);
    await dialog.getByLabel("Start date").fill("2031-02-01");
    await dialog.getByLabel("End date").fill("2031-01-01");
    await dialog.getByRole("button", { name: "Create semester" }).click();
    await expect(dialog.getByText("The end date must be after the start date.")).toBeVisible();
    await dialog.getByLabel("End date").fill("2031-06-01");
    await dialog.getByRole("button", { name: "Create semester" }).click();
    await expect(dialog).toBeHidden();

    const toggle = page.getByRole("switch", { name: `${name} open for registration` });
    await expect(toggle).toBeChecked();
    await toggle.click();
    await expect(toggle).not.toBeChecked();
    await expect(toggle).toBeEnabled();

    await page.getByRole("row").filter({ hasText: name }).getByRole("button", { name: "Delete" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete semester" }).click();
    await expect(page.getByRole("row").filter({ hasText: name })).toHaveCount(0);
  });

  test("sections: multiple meetings, teacher assignment, end-before-start rejected", async ({ page }) => {
    const admin = await apiAs(new URL(page.url()).origin, accounts.admin());
    const fall = await semesterByName(admin, "Fall 2026");
    const { course } = await createSection(admin, fall.semester_id, { meetings: [{ meeting_day: 0, start_time: "06:00", end_time: "07:00" }] });
    await admin.dispose();

    await page.goto("/admin/sections");
    await page.getByRole("button", { name: "Add section" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Course").selectOption(String(course.course_id));
    await dialog.getByLabel("Semester").selectOption(String(fall.semester_id));
    await dialog.getByLabel("Section number").fill("Z");
    await dialog.getByLabel("Capacity").fill("15");
    await dialog.getByLabel("Teacher").selectOption({ label: accounts.teacher(1).email });
    await dialog.locator("#meeting-0-start").fill("13:00");
    await dialog.locator("#meeting-0-end").fill("12:00");
    await dialog.getByRole("button", { name: "Create section" }).click();
    await expect(dialog.getByText("The end time must be after the start time.")).toBeVisible();

    await dialog.locator("#meeting-0-end").fill("14:00");
    await dialog.getByRole("button", { name: "Add meeting" }).click();
    await dialog.locator("#meeting-1-day").selectOption("3");
    await dialog.locator("#meeting-1-start").fill("13:00");
    await dialog.locator("#meeting-1-end").fill("14:00");
    await dialog.getByRole("button", { name: "Create section" }).click();
    await expect(dialog).toBeHidden();

    const sections = await (await page.request.get(`/api/proxy/sections?course_id=${course.course_id}&limit=100`)).json();
    const created = sections.items.find((section: { section_number: string }) => section.section_number === "Z");
    expect(created.meetings).toHaveLength(2);
    expect(created.teacher_id).not.toBeNull();
    expect(created.capacity).toBe(15);
  });

  test("students: create, search, edit, deactivate blocks login, reactivate", async ({ page, browser }) => {
    const id = uniqueId().toLowerCase();
    const email = `ui-${id}@example.edu`;
    const password = "e2e-student-password";
    const name = `Student ${id}`;

    await page.goto("/admin/students");
    await page.getByRole("button", { name: "Add student" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Full name").fill(name);
    await dialog.getByLabel("Email").fill(email);
    await dialog.getByLabel("Initial password").fill(password);
    await dialog.getByLabel("Year level").fill("1");
    await dialog.getByRole("button", { name: "Create student" }).click();
    await expect(dialog).toBeHidden();

    await page.getByLabel("Search").fill(email);
    const row = page.getByRole("row").filter({ hasText: email });
    await expect(row).toContainText("Active");
    await row.getByRole("button", { name: "Edit" }).click();
    await page.getByRole("dialog").getByLabel("Program (optional)").fill("Biology");
    await page.getByRole("dialog").getByRole("button", { name: "Save changes" }).click();
    await expect(row).toContainText("Biology");

    await row.getByRole("button", { name: "Deactivate" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Deactivate student" }).click();
    await expect(row).toContainText("Inactive");

    const other = await browser.newPage({ baseURL: new URL(page.url()).origin });
    await other.goto("/login");
    await other.getByLabel("Email").fill(email);
    await other.getByLabel("Password", { exact: true }).fill(password);
    await other.getByRole("button", { name: "Sign in" }).click();
    await expect(other.getByRole("alert").filter({ hasText: "Incorrect" })).toContainText("Incorrect email or password");
    await other.close();

    await row.getByRole("button", { name: "Reactivate" }).click();
    await expect(row).toContainText("Active");
  });

  test("registrations: filter by status and student, change status, re-enroll", async ({ page }) => {
    const origin = new URL(page.url()).origin;
    const admin: APIRequestContext = await apiAs(origin, accounts.admin());
    const fall = await semesterByName(admin, "Fall 2026");
    const { course, section } = await createSection(admin, fall.semester_id, { meetings: [{ meeting_day: 6, start_time: "22:00", end_time: "23:00" }] });
    await admin.dispose();

    await page.goto("/admin/registrations");
    await page.getByRole("button", { name: "Enroll student" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Student").selectOption({ label: "Taylor Kim (#3)" });
    await dialog.getByLabel("Section").selectOption(String(section.section_id));
    await dialog.getByRole("button", { name: "Enroll student" }).click();
    await expect(dialog).toBeHidden();

    await page.getByLabel("Section", { exact: true }).selectOption(String(section.section_id));
    const row = page.getByRole("row").filter({ hasText: course.course_code });
    await expect(row).toContainText("Taylor Kim");
    await expect(row).toContainText("Enrolled");

    await page.getByLabel("Student", { exact: true }).fill("no such student");
    await expect(row).toHaveCount(0);
    await page.getByLabel("Student", { exact: true }).fill("Taylor");
    await expect(row).toHaveCount(1);

    await row.getByRole("combobox").selectOption("Rejected");
    await expect(row).toContainText("Rejected");
    await page.getByLabel("Status", { exact: true }).selectOption("Enrolled");
    await expect(row).toHaveCount(0);
    await page.getByLabel("Status", { exact: true }).selectOption("Rejected");
    await row.getByRole("button", { name: "Enroll" }).click();
    await expect(page.getByText("Student enrolled.")).toBeVisible();
    await page.getByLabel("Status", { exact: true }).selectOption("");
    await expect(row).toContainText("Enrolled");
  });

  test("staff: create a teacher, who can then sign in", async ({ page, browser }) => {
    const email = `t-${uniqueId().toLowerCase()}@example.edu`;
    const password = "e2e-teacher-password";
    await page.goto("/admin/staff");
    await page.getByRole("button", { name: "Add staff" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Email").fill(email);
    await dialog.getByLabel("Initial password").fill(password);
    await dialog.getByRole("button", { name: "Create account" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("row").filter({ hasText: email })).toContainText("Teacher");

    const other = await browser.newPage({ baseURL: new URL(page.url()).origin });
    await signIn(other, { email, password });
    await expect(other).toHaveURL(/\/teacher$/);
    await other.close();
  });

  test("the current administrator cannot deactivate themselves", async ({ page }) => {
    await page.goto("/admin/staff");
    await expect(page.getByRole("switch", { name: `${accounts.admin().email} active` })).toBeDisabled();
  });

  test("admin tables stay on screen on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ["/admin", "/admin/students", "/admin/sections", "/admin/registrations", "/courses"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Students" }).click();
    await expect(page).toHaveURL(/\/admin\/students$/);
    await expect(page.getByRole("dialog")).toBeHidden();
  });
});
