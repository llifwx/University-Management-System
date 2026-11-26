"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText, Paperclip, Plus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { MATERIAL_CATEGORIES, materialQueries } from "@/entities/materials";
import { useSessionUser } from "@/entities/user";
import { DeleteMaterialButton, UploadMaterialDialog } from "@/features/manage-materials";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { NativeSelect } from "@/shared/ui/native-select";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState, QueryState } from "@/shared/ui/states";

const DATE = { dateStyle: "medium" } as const;
const ALL = "all";

export function MaterialsPage() {
  const t = useTranslations("pages.materials");
  const tCategory = useTranslations("pages.materials.categories");
  const format = useFormatter();
  const user = useSessionUser();
  const isTeacher = user.role === "TEACHER";
  const [category, setCategory] = useState<string>(ALL);
  const [sectionId, setSectionId] = useState<string>(ALL);

  const materials = useQuery(materialQueries.list());
  const rows = useMemo(() => materials.data ?? [], [materials.data]);

  const sectionOptions = useMemo(() => {
    const seen = new Map<number, string>();
    for (const material of rows) {
      if (!seen.has(material.section_id)) {
        seen.set(material.section_id, `${material.course_code} — ${material.course_title} (${material.section_number})`);
      }
    }
    return [...seen.entries()];
  }, [rows]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (material) =>
          (category === ALL || material.category === category) &&
          (sectionId === ALL || material.section_id === Number(sectionId)),
      ),
    [rows, category, sectionId],
  );

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          isTeacher && (
            <UploadMaterialDialog
              trigger={
                <Button>
                  <Plus aria-hidden />
                  {t("upload")}
                </Button>
              }
            />
          )
        }
      />
      <QueryState query={materials}>
        {() =>
          rows.length === 0 ? (
            <EmptyState icon={FileText} title={t("empty.title")} description={t("empty.description")} />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <NativeSelect className="w-auto" value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value={ALL}>{t("filters.allCategories")}</option>
                  {MATERIAL_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {tCategory(item)}
                    </option>
                  ))}
                </NativeSelect>
                <NativeSelect className="w-auto" value={sectionId} onChange={(event) => setSectionId(event.target.value)}>
                  <option value={ALL}>{t("filters.allCourses")}</option>
                  {sectionOptions.map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              {filtered.length === 0 ? (
                <EmptyState title={t("empty.noMatches")} />
              ) : (
                <ul className="space-y-3">
                  {filtered.map((material) => {
                    const href = `/api/proxy${material.attachment_url}`;
                    return (
                      <li key={material.id}>
                        <Card className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary">{tCategory(material.category)}</Badge>
                                <h2 className="truncate font-medium">{material.title}</h2>
                              </div>
                              <p className="text-muted-foreground text-sm">
                                {material.course_code} — {material.course_title} ({material.section_number})
                              </p>
                              {material.description && <p className="text-sm">{material.description}</p>}
                              <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm underline">
                                <Paperclip className="size-4 shrink-0" aria-hidden />
                                {material.attachment_name}
                              </a>
                              <p className="text-muted-foreground text-xs">
                                {t("uploadedBy", { name: material.uploaded_by_name ?? "" })} · {format.dateTime(new Date(material.created_at), DATE)}
                              </p>
                            </div>
                            {isTeacher && <DeleteMaterialButton material={material} />}
                          </div>
                        </Card>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )
        }
      </QueryState>
    </>
  );
}
