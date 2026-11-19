/** Friendlier sentences for the codes FastAPI's enrollment service raises. Unlisted codes show the backend message. */
export function registrationErrorMessages(t: (key: string) => string): Record<string, string> {
  return {
    SCHEDULE_CONFLICT: t("scheduleConflict"),
    DUPLICATE_REGISTRATION: t("duplicateRegistration"),
    SECTION_FULL: t("sectionFull"),
    REGISTRATION_CLOSED: t("registrationClosed"),
    SEMESTER_MISMATCH: t("semesterMismatch"),
    INACTIVE_STUDENT: t("inactiveStudent"),
    UNSCHEDULED_SECTION: t("unscheduledSection"),
  };
}

/** Same codes from an administrator's point of view: they are enrolling somebody else. */
export function adminRegistrationErrorMessages(t: (key: string) => string): Record<string, string> {
  return {
    ...registrationErrorMessages(t),
    SCHEDULE_CONFLICT: t("adminScheduleConflict"),
    DUPLICATE_REGISTRATION: t("adminDuplicateRegistration"),
  };
}
