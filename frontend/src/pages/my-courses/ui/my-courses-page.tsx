import { PageHeader } from "@/shared/ui/page-header";
import { EnrollmentTable } from "@/widgets/enrollment-table";

export function MyCoursesPage() {
  return (
    <>
      <PageHeader title="My courses" description="Your registrations across semesters." />
      <EnrollmentTable />
    </>
  );
}
