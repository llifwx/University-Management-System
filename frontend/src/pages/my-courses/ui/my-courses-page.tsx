import { useTranslations } from "next-intl";

import { PageHeader } from "@/shared/ui/page-header";
import { EnrollmentTable } from "@/widgets/enrollment-table";

export function MyCoursesPage() {
  const t = useTranslations("pages.myCourses");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <EnrollmentTable />
    </>
  );
}
