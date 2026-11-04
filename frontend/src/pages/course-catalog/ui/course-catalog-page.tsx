import { PageHeader } from "@/shared/ui/page-header";
import { CourseCatalog } from "@/widgets/course-catalog";

export function CourseCatalogPage() {
  return (
    <>
      <PageHeader title="Course catalog" description="Find a course, compare its sections and register." />
      <CourseCatalog />
    </>
  );
}
