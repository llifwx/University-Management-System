import { useTranslations } from "next-intl";

import { PageHeader } from "@/shared/ui/page-header";
import { CourseSections } from "@/widgets/course-sections";

export function CourseDetailsPage({ courseId }: { courseId: number }) {
  const t = useTranslations("pages.courseDetails");
  return (
    <>
      <div className="-mb-4">
        <PageHeader title="" crumbs={[{ label: t("breadcrumbs.courseCatalog"), href: "/courses" }, { label: t("breadcrumbs.courseDetails") }]} />
      </div>
      <CourseSections courseId={courseId} />
    </>
  );
}
