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

/** Backend `error.message` is shown unless a translated sentence exists for that code. `byCode` overrides take priority over the shared `errors.*` dictionary. */
export function getErrorMessage(
  error: unknown,
  hasCode: (code: string) => boolean,
  translateCode: (code: string) => string,
  networkErrorMessage: string,
  byCode: Record<string, string> = {},
): string {
  if (error instanceof ApiError) {
    if (byCode[error.code]) return byCode[error.code];
    if (hasCode(error.code)) return translateCode(error.code);
    const detail = error.details.find((d) => d.message)?.message;
    return detail ? `${error.message} ${detail}` : error.message;
  }
  return networkErrorMessage;
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
