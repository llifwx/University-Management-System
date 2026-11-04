import type { User } from "@/entities/user";
import { parseApiError } from "@/shared/api";

/** Goes to the BFF login route, which keeps the tokens in HttpOnly cookies and returns only the user. */
export async function login(credentials: { email: string; password: string }): Promise<User> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  if (!response.ok) throw await parseApiError(response);
  return response.json();
}
