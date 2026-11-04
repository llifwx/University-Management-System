import { APIRequestContext, Page, expect, request } from "@playwright/test";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} (see "End-to-end tests" in README.md)`);
  return value;
}

export const accounts = {
  admin: () => ({ email: process.env.E2E_ADMIN_EMAIL ?? "admin@example.edu", password: required("E2E_ADMIN_PASSWORD") }),
  // Seeded demo accounts share SEED_PASSWORD.
  student: (n: number) => ({ email: `student${n}@demo.example.edu`, password: required("E2E_SEED_PASSWORD") }),
  teacher: (n: number) => ({ email: `teacher${n}@demo.example.edu`, password: required("E2E_SEED_PASSWORD") }),
};

export async function signIn(page: Page, { email, password }: { email: string; password: string }, path = "/login") {
  await page.goto(path);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

/** An API client that goes through the BFF exactly as the browser does. */
export async function apiAs(baseURL: string, { email, password }: { email: string; password: string }): Promise<APIRequestContext> {
  const context = await request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
  const response = await context.post("/api/auth/login", { data: { email, password } });
  expect(response.status()).toBe(200);
  return context;
}

export async function create<T>(api: APIRequestContext, path: string, data: unknown): Promise<T> {
  const response = await api.post(`/api/proxy${path}`, { data });
  expect(response.status(), await response.text()).toBe(201);
  return response.json();
}

/** Unique per run, because the database outlives test runs. */
export const uniqueId = () => Date.now().toString(36).toUpperCase();

export async function semesterByName(api: APIRequestContext, name: string): Promise<{ semester_id: number }> {
  const body = await (await api.get("/api/proxy/semesters?limit=100")).json();
  return body.items.find((semester: { name: string }) => semester.name === name);
}

/** Admin-created course with one section, isolated from seeded data. */
export async function createSection(
  api: APIRequestContext,
  semesterId: number,
  { capacity = 10, meetings }: { capacity?: number; meetings: { meeting_day: number; start_time: string; end_time: string }[] },
) {
  const id = uniqueId();
  const course = await create<{ course_id: number; course_code: string; course_title: string }>(api, "/courses", { course_code: `E2E${id}`, course_title: `End to end ${id}`, credits: 3 });
  const section = await create<{ section_id: number }>(api, "/sections", { course_id: course.course_id, semester_id: semesterId, section_number: "A", capacity, meetings });
  return { course, section };
}
