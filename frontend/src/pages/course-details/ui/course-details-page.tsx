import { PageHeader } from "@/shared/ui/page-header";
import { CourseSections } from "@/widgets/course-sections";

export function CourseDetailsPage({ courseId }: { courseId: number }) {
  return (
    <>
      <div className="-mb-4">
        <PageHeader title="" crumbs={[{ label: "Course catalog", href: "/courses" }, { label: "Course details" }]} />
      </div>
      <CourseSections courseId={courseId} />
    </>
  );
}
