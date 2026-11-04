/** Friendlier sentences for the codes FastAPI's enrollment service raises. Unlisted codes show the backend message. */
export const REGISTRATION_ERROR_MESSAGES: Record<string, string> = {
  SCHEDULE_CONFLICT: "This section overlaps with an existing class in your schedule.",
  DUPLICATE_REGISTRATION: "You are already enrolled in this section.",
  SECTION_FULL: "This section is full: no seats remain.",
  REGISTRATION_CLOSED: "Registration is closed for this semester.",
  SEMESTER_MISMATCH: "This section belongs to a different semester.",
  INACTIVE_STUDENT: "This student account is inactive.",
  UNSCHEDULED_SECTION: "This section has no meeting schedule yet, so it cannot be joined.",
};

/** Same codes from an administrator's point of view: they are enrolling somebody else. */
export const ADMIN_REGISTRATION_ERROR_MESSAGES: Record<string, string> = {
  ...REGISTRATION_ERROR_MESSAGES,
  SCHEDULE_CONFLICT: "This section overlaps with an existing class in the student's schedule.",
  DUPLICATE_REGISTRATION: "This student is already enrolled in this section.",
};
