import { z } from "zod";

const meetingSchema = z
  .object({
    meeting_day: z.number().int().min(0).max(6),
    start_time: z.string().min(1, "Choose a start time."),
    end_time: z.string().min(1, "Choose an end time."),
  })
  // "HH:MM" strings compare chronologically. The backend rejects overnight meetings.
  .refine((m) => !m.start_time || !m.end_time || m.start_time < m.end_time, { path: ["end_time"], message: "The end time must be after the start time." });

export const sectionSchema = z.object({
  course_id: z.number("Choose a course.").int().positive("Choose a course."),
  semester_id: z.number("Choose a semester.").int().positive("Choose a semester."),
  section_number: z.string().trim().min(1, "Enter a section number.").max(20, "Use at most 20 characters."),
  capacity: z.number("Enter the capacity.").int("Use a whole number.").positive("Capacity must be at least 1."),
  teacher_id: z.number().int().positive().nullable(),
  meetings: z.array(meetingSchema).min(1, "Add at least one weekly meeting.").max(30, "Use at most 30 meetings."),
});
export type SectionValues = z.infer<typeof sectionSchema>;
