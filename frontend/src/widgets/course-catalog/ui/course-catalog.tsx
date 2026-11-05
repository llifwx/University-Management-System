"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { courseQueries, searchCourses } from "@/entities/course";
import { sectionQueries } from "@/entities/course-section";
import { SemesterSelect, useSemesterParam } from "@/features/select-semester";
import { useClientPagination } from "@/shared/lib/use-client-pagination";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { PaginationControls } from "@/shared/ui/data-table";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { EmptyState, QueryState } from "@/shared/ui/states";
import { Switch } from "@/shared/ui/switch";

export function CourseCatalog() {
  const [term, setTerm] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const { semesters, semesterId, setSemesterId } = useSemesterParam();
  const courses = useQuery(courseQueries.list());
  const sections = useQuery(sectionQueries.list({ semester_id: semesterId, available_only: availableOnly || undefined }));

  const sectionsByCourse = useMemo(() => {
    const grouped = new Map<number, { count: number; seats: number }>();
    for (const section of sections.data ?? []) {
      const entry = grouped.get(section.course_id) ?? { count: 0, seats: 0 };
      entry.count += 1;
      entry.seats += section.remaining_capacity;
      grouped.set(section.course_id, entry);
    }
    return grouped;
  }, [sections.data]);

  const scopedToSections = semesterId !== undefined || availableOnly;
  const visible = useMemo(() => {
    const matches = searchCourses(courses.data ?? [], term);
    return scopedToSections ? matches.filter((course) => sectionsByCourse.has(course.course_id)) : matches;
  }, [courses.data, term, scopedToSections, sectionsByCourse]);
  const pagination = useClientPagination(visible, 12);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1 basis-64 space-y-1.5">
          <Label htmlFor="course-search">Search</Label>
          <div className="relative">
            <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" aria-hidden />
            <Input id="course-search" type="search" className="pl-9" placeholder="Name or code" value={term} onChange={(event) => setTerm(event.target.value)} />
          </div>
        </div>
        <SemesterSelect semesters={semesters} value={semesterId} onChange={setSemesterId} allowAll />
        <div className="flex h-9 items-center gap-2">
          <Switch id="available-only" checked={availableOnly} onCheckedChange={setAvailableOnly} />
          <Label htmlFor="available-only">Seats available</Label>
        </div>
      </div>

      <QueryState query={courses}>
        {() =>
          visible.length === 0 ? (
            <EmptyState icon={BookOpen} title="No courses found" description="Try a different search or semester." />
          ) : (
            <>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {pagination.pageItems.map((course) => {
                  const summary = sectionsByCourse.get(course.course_id);
                  return (
                    <li key={course.course_id}>
                      <Card className="hover:border-primary/40 relative h-full shadow-sm transition-colors">
                        <CardContent className="flex h-full flex-col gap-2 p-5">
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="secondary">{course.course_code}</Badge>
                            <span className="text-muted-foreground text-xs">
                              {course.credits} {course.credits === 1 ? "credit" : "credits"}
                            </span>
                          </div>
                          <h2 className="font-semibold">
                            <Link href={`/courses/${course.course_id}`} className="after:absolute after:inset-0 hover:underline">
                              {course.course_title}
                            </Link>
                          </h2>
                          {course.description && <p className="text-muted-foreground line-clamp-2 text-sm">{course.description}</p>}
                          <p className="text-muted-foreground mt-auto pt-2 text-xs">
                            {summary ? `${summary.count} ${summary.count === 1 ? "section" : "sections"} · ${summary.seats} seats left` : "No sections listed"}
                          </p>
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ul>
              <PaginationControls page={pagination.page} pageCount={pagination.pageCount} total={pagination.total} onPageChange={pagination.setPage} />
            </>
          )
        }
      </QueryState>
    </div>
  );
}
