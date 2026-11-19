import { useTranslations } from "next-intl";

import { PageHeader } from "@/shared/ui/page-header";
import { CourseCatalog } from "@/widgets/course-catalog";

export function CourseCatalogPage() {
  const t = useTranslations("pages.courseCatalog");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <CourseCatalog />
    </>
  );
}
