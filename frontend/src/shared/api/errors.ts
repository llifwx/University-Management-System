import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

export type ApiErrorDetail = { location?: (string | number)[]; message?: string };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const NETWORK_ERROR_MESSAGE = "Could not reach the server. Check your connection and try again.";

/** Backend `error.message` is shown unless the caller has a clearer sentence for that code. */
export function getErrorMessage(error: unknown, byCode: Record<string, string> = {}): string {
  if (error instanceof ApiError) {
    if (byCode[error.code]) return byCode[error.code];
    const detail = error.details.find((d) => d.message)?.message;
    return detail ? `${error.message} ${detail}` : error.message;
  }
  return NETWORK_ERROR_MESSAGE;
}

/** Puts FastAPI 422 details on matching form fields; returns false when nothing matched. */
export function applyFieldErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>): boolean {
  if (!(error instanceof ApiError) || error.status !== 422) return false;
  let applied = false;
  for (const { location, message } of error.details) {
    const field = location?.slice(1).join(".");
    if (field && message) {
      setError(field as Path<T>, { message });
      applied = true;
    }
  }
  return applied;
}
