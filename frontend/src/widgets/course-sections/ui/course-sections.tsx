"use client";

import { useQuery } from "@tanstack/react-query";
import { Layers, Users } from "lucide-react";
import { useMemo } from "react";

import { courseQueries } from "@/entities/course";
import { MeetingList, Section, instructorLabel, sectionQueries } from "@/entities/course-section";
import { registrationQueries } from "@/entities/registration";
import { useSessionUser } from "@/entities/user";
import { RegisterButton } from "@/features/register-for-section";
import { SemesterSelect, useSemesterParam } from "@/features/select-semester";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { EmptyState, QueryState } from "@/shared/ui/states";

function SectionCard({ section, semesterName, semesterOpen, enrolled, canRegister }: { section: Section; semesterName?: string; semesterOpen: boolean; enrolled: boolean; canRegister: boolean }) {
  const full = section.remaining_capacity <= 0;
  return (
    <Card className="shadow-sm">
      <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto]">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">Section {section.section_number}</h3>
            {semesterName && <Badge variant="outline">{semesterName}</Badge>}
            {enrolled && <Badge>Enrolled</Badge>}
            {!semesterOpen && <Badge variant="secondary">Registration closed</Badge>}
          </div>
          <div className="text-sm">
            <MeetingList meetings={section.meetings} />
          </div>
          <p className="text-muted-foreground text-sm">{instructorLabel(section.teacher_id)}</p>
          <p className="text-muted-foreground flex items-center gap-1.5 text-sm tabular-nums">
            <Users className="size-4" aria-hidden />
            {section.remaining_capacity} of {section.capacity} seats remaining
          </p>
        </div>
        {canRegister && !enrolled && (
          <div className="md:w-64 md:text-right">
            <RegisterButton sectionId={section.section_id} semesterId={section.semester_id} disabled={full || !semesterOpen} label={full ? "Section full" : "Register"} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CourseSections({ courseId }: { courseId: number }) {
  const user = useSessionUser();
  const isStudent = user.role === "STUDENT";
  const course = useQuery(courseQueries.detail(courseId));
  const { semesters, semesterId, setSemesterId } = useSemesterParam();
  const sections = useQuery(sectionQueries.list({ course_id: courseId, semester_id: semesterId }));
  const mine = useQuery({ ...registrationQueries.mine(semesterId), enabled: isStudent });

  const enrolledSections = useMemo(() => new Set(mine.data?.filter((r) => r.status === "Enrolled").map((r) => r.section_id)), [mine.data]);
  const semesterById = useMemo(() => new Map(semesters?.map((s) => [s.semester_id, s])), [semesters]);

  return (
    <div className="space-y-6">
      <QueryState query={course}>
        {(data) => (
          <header className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{data.course_code}</Badge>
              <span className="text-muted-foreground text-sm">
                {data.credits} {data.credits === 1 ? "credit" : "credits"}
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{data.course_title}</h1>
            {data.description && <p className="text-muted-foreground max-w-3xl text-sm">{data.description}</p>}
          </header>
        )}
      </QueryState>

      <section aria-labelledby="sections-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="sections-heading" className="text-lg font-semibold">
            Available sections
          </h2>
          <SemesterSelect semesters={semesters} value={semesterId} onChange={setSemesterId} allowAll />
        </div>
        <QueryState query={sections}>
          {(data) =>
            data.length === 0 ? (
              <EmptyState icon={Layers} title="No sections" description="This course has no sections for the selected semester." />
            ) : (
              <ul className="space-y-3">
                {data.map((section) => {
                  const semester = semesterById.get(section.semester_id);
                  return (
                    <li key={section.section_id}>
                      <SectionCard
                        section={section}
                        semesterName={semester?.name}
                        semesterOpen={semester?.is_active ?? true}
                        enrolled={enrolledSections.has(section.section_id)}
                        canRegister={isStudent}
                      />
                    </li>
                  );
                })}
              </ul>
            )
          }
        </QueryState>
      </section>
    </div>
  );
}
