"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Course, courseQueries, searchCourses } from "@/entities/course";
import { CourseFormDialog, DeleteCourseButton } from "@/features/manage-course";
import { useClientPagination } from "@/shared/lib/use-client-pagination";
import { Button } from "@/shared/ui/button";
import { Column, DataTable, PaginationControls } from "@/shared/ui/data-table";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState, QueryState } from "@/shared/ui/states";

function getColumns(t: ReturnType<typeof useTranslations<"pages.courseManagement">>): Column<Course>[] {
  return [
    { header: t("columns.code"), cell: (course) => <span className="font-medium">{course.course_code}</span> },
    {
      header: t("columns.title"),
      cell: (course) => (
        <Link href={`/courses/${course.course_id}`} className="hover:underline">
          {course.course_title}
        </Link>
      ),
    },
    { header: t("columns.credits"), cell: (course) => course.credits },
    {
      header: t("columns.actions"),
      cell: (course) => (
        <div className="flex justify-end gap-1 md:justify-start">
          <CourseFormDialog
            course={course}
            trigger={
              <Button variant="ghost" size="sm">
                {t("edit")}
              </Button>
            }
          />
          <DeleteCourseButton course={course} />
        </div>
      ),
    },
  ];
}

export function CourseManagementPage() {
  const t = useTranslations("pages.courseManagement");
  const [term, setTerm] = useState("");
  const courses = useQuery(courseQueries.list());
  const filtered = useMemo(() => searchCourses(courses.data ?? [], term), [courses.data, term]);
  const pagination = useClientPagination(filtered);
  const columns = useMemo(() => getColumns(t), [t]);
  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <CourseFormDialog
            trigger={
              <Button>
                <Plus aria-hidden />
                {t("addCourse")}
              </Button>
            }
          />
        }
      />
      <div className="mb-4 max-w-sm space-y-1.5">
        <Label htmlFor="admin-course-search">{t("search")}</Label>
        <Input id="admin-course-search" type="search" placeholder={t("searchPlaceholder")} value={term} onChange={(event) => setTerm(event.target.value)} />
      </div>
      <QueryState query={courses}>
        {() =>
          filtered.length === 0 ? (
            <EmptyState icon={BookOpen} title={t("empty")} />
          ) : (
            <>
              <DataTable caption={t("caption")} columns={columns} rows={pagination.pageItems} rowKey={(course) => course.course_id} />
              <PaginationControls page={pagination.page} pageCount={pagination.pageCount} total={pagination.total} onPageChange={pagination.setPage} />
            </>
          )
        }
      </QueryState>
    </>
  );
}
