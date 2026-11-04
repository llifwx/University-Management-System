import { expect, test } from "@playwright/test";

import { accounts, signIn } from "./helpers";

test.describe("authentication", () => {
  test("anonymous visitors are sent to login, keeping their destination", async ({ page }) => {
    await page.goto("/my-courses");
    await expect(page).toHaveURL(/\/login\?next=%2Fmy-courses/);
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("invalid credentials show an error and stay on login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@example.edu");
    await page.getByLabel("Password", { exact: true }).fill("definitely-wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Incorrect" })).toContainText("Incorrect email or password");
    await expect(page).toHaveURL(/\/login/);
  });

  for (const [name, account, home] of [
    ["student", () => accounts.student(1), /\/dashboard$/],
    ["teacher", () => accounts.teacher(1), /\/teacher$/],
    ["admin", () => accounts.admin(), /\/admin$/],
  ] as const) {
    test(`a ${name} lands on their dashboard`, async ({ page }) => {
      await signIn(page, account());
      await expect(page).toHaveURL(home);
      await page.goto("/");
      await expect(page).toHaveURL(home);
      await page.goto("/login");
      await expect(page).toHaveURL(home);
    });
  }

  test("tokens never reach JavaScript", async ({ page, context }) => {
    await signIn(page, accounts.student(1));
    const cookies = await context.cookies();
    const session = cookies.filter((cookie) => cookie.name.startsWith("ums_"));
    expect(session.map((cookie) => cookie.name).sort()).toEqual(["ums_access", "ums_refresh"]);
    expect(session.every((cookie) => cookie.httpOnly && cookie.sameSite === "Lax")).toBe(true);
    expect(await page.evaluate(() => document.cookie)).not.toContain("ums_");
    expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toMatch(/ey[A-Za-z0-9_-]{10,}/);
  });

  test("an expired access token renews silently, even with parallel requests", async ({ page, context }) => {
    await signIn(page, accounts.student(1));
    const original = (await context.cookies()).find((cookie) => cookie.name === "ums_refresh")!.value;

    // The dashboard fires several API calls at once on a full load with only the refresh cookie.
    await context.clearCookies({ name: "ums_access" });
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
    const after = await context.cookies();
    expect(after.find((cookie) => cookie.name === "ums_refresh")!.value).not.toBe(original);

    // Now from the client: drop the access cookie while the SPA is running.
    await context.clearCookies({ name: "ums_access" });
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Schedule" }).click();
    await expect(page.getByRole("heading", { name: "Weekly schedule" })).toBeVisible();
    await page.goto("/profile");
    await expect(page.getByText("Student ID")).toBeVisible();
  });

  test("a garbage access token recovers through refresh", async ({ page, context }) => {
    await signIn(page, accounts.student(1));
    const { domain } = (await context.cookies())[0];
    await context.addCookies([{ name: "ums_access", value: "garbage", domain, path: "/", httpOnly: true, sameSite: "Lax" }]);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
  });

  test("a session that cannot be renewed ends at login", async ({ page, context }) => {
    await signIn(page, accounts.student(1));
    await page.waitForLoadState("networkidle"); // In-flight dashboard calls would redirect first.
    const { domain } = (await context.cookies())[0];
    await context.clearCookies({ name: "ums_access" });
    await context.addCookies([{ name: "ums_refresh", value: "not-a-token", domain, path: "/", httpOnly: true, sameSite: "Lax" }]);
    await page.goto("/my-courses");
    await expect(page).toHaveURL(/\/login\?expired=1&next=%2Fmy-courses/);
    await expect(page.getByRole("status")).toContainText("session has ended");
  });

  test("logging out revokes the session on the server", async ({ page, context }) => {
    await signIn(page, accounts.student(1));
    const access = (await context.cookies()).find((cookie) => cookie.name === "ums_access")!;
    await page.getByRole("button", { name: /Account menu/ }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect((await context.cookies()).filter((cookie) => cookie.name.startsWith("ums_"))).toEqual([]);

    // Replaying the old cookie proves revocation rather than mere cookie deletion.
    await context.addCookies([access]);
    const replay = await page.request.get("/api/proxy/auth/me");
    expect(replay.status()).toBe(401);
  });

  test("cross-site writes are refused", async ({ page }) => {
    await signIn(page, accounts.student(1));
    const response = await page.request.post("/api/proxy/registrations", { data: { section_id: 1, semester_id: 1 }, headers: { Origin: "https://evil.example" } });
    expect(response.status()).toBe(403);
  });

  test("token routes cannot be reached through the proxy", async ({ page }) => {
    await signIn(page, accounts.student(1));
    const response = await page.request.post("/api/proxy/auth/refresh", { data: {}, headers: { Origin: new URL(page.url()).origin } });
    expect(response.status()).toBe(404);
  });
});

test.describe("permissions", () => {
  test("a student gets a 403 screen for admin and teacher areas, and FastAPI refuses the data", async ({ page }) => {
    await signIn(page, accounts.student(1));
    await page.goto("/admin/students");
    await expect(page.getByRole("heading", { name: /403/ })).toBeVisible();
    await page.goto("/teacher");
    await expect(page.getByRole("heading", { name: /403/ })).toBeVisible();
    expect((await page.request.get("/api/proxy/students")).status()).toBe(403);
    await expect(page.getByRole("link", { name: "Students" })).toHaveCount(0);
  });

  test("a teacher gets a 403 screen for student and admin areas", async ({ page }) => {
    await signIn(page, accounts.teacher(1));
    await page.goto("/my-courses");
    await expect(page.getByRole("heading", { name: /403/ })).toBeVisible();
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: /403/ })).toBeVisible();
  });

  test("unknown URLs get the 404 screen", async ({ page }) => {
    await signIn(page, accounts.student(1));
    await page.goto("/no-such-page");
    await expect(page.getByRole("heading", { name: /404/ })).toBeVisible();
    await page.goto("/courses/not-a-number");
    await expect(page.getByRole("heading", { name: /404/ })).toBeVisible();
  });
});
