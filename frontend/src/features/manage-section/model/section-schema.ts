import { useTranslations } from "next-intl";
import { z } from "zod";

type Translator = ReturnType<typeof useTranslations>;

function buildMeetingSchema(t: Translator) {
  return z
    .object({
      meeting_day: z.number().int().min(0).max(6),
      start_time: z.string().min(1, t("validation.startTimeRequired")),
      end_time: z.string().min(1, t("validation.endTimeRequired")),
      room_id: z.number().int().positive().nullable(),
    })
    // "HH:MM" strings compare chronologically. The backend rejects overnight meetings.
    .refine((m) => !m.start_time || !m.end_time || m.start_time < m.end_time, { path: ["end_time"], message: t("validation.endAfterStart") });
}

export function buildSectionSchema(t: Translator) {
  return z.object({
    course_id: z.number(t("validation.courseRequired")).int().positive(t("validation.courseRequired")),
    semester_id: z.number(t("validation.semesterRequired")).int().positive(t("validation.semesterRequired")),
    section_number: z.string().trim().min(1, t("validation.sectionNumberRequired")).max(20, t("validation.sectionNumberMax")),
    capacity: z.number(t("validation.capacityRequired")).int(t("validation.capacityInt")).positive(t("validation.capacityPositive")),
    teacher_id: z.number().int().positive().nullable(),
    meetings: z.array(buildMeetingSchema(t)).min(1, t("validation.meetingsMin")).max(30, t("validation.meetingsMax")),
  });
}
export type SectionValues = z.infer<ReturnType<typeof buildSectionSchema>>;
