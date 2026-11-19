"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Shield } from "lucide-react";
import { useTranslations } from "next-intl";

import { roleLabels, User, useSessionUser, userQueries } from "@/entities/user";
import { CreateStaffDialog, EditStaffProfileDialog, ResetPasswordDialog, StaffActiveSwitch } from "@/features/manage-staff";
import { Button } from "@/shared/ui/button";
import { Column, DataTable } from "@/shared/ui/data-table";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState, QueryState } from "@/shared/ui/states";

export function StaffManagementPage() {
  const t = useTranslations("pages.staffManagement");
  const me = useSessionUser();
  const users = useQuery(userQueries.list());
  const columns: Column<User>[] = [
    {
      header: t("columns.name"),
      cell: (user) => (
        <div>
          <p className="font-medium">{user.full_name ?? <span className="text-muted-foreground italic">{t("noName")}</span>}</p>
          {(user.title || user.department) && <p className="text-muted-foreground text-xs">{[user.title, user.department].filter(Boolean).join(" · ")}</p>}
        </div>
      ),
    },
    { header: t("columns.email"), cell: (user) => <span className="break-all">{user.email}</span> },
    { header: t("columns.role"), cell: (user) => roleLabels(t)[user.role] },
    { header: t("columns.active"), cell: (user) => <StaffActiveSwitch user={user} disabled={user.id === me.id} /> },
    {
      header: t("columns.actions"),
      cell: (user) => (
        <div className="flex gap-1">
          <EditStaffProfileDialog
            user={user}
            trigger={
              <Button variant="ghost" size="sm">
                {t("editProfile")}
              </Button>
            }
          />
          <ResetPasswordDialog
            user={user}
            trigger={
              <Button variant="ghost" size="sm">
                {t("changePassword")}
              </Button>
            }
          />
        </div>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <CreateStaffDialog
            trigger={
              <Button>
                <Plus aria-hidden />
                {t("addStaff")}
              </Button>
            }
          />
        }
      />
      <QueryState query={users}>
        {(rows) => {
          const staff = rows.filter((user) => user.role !== "STUDENT");
          return staff.length === 0 ? <EmptyState icon={Shield} title={t("empty")} /> : <DataTable caption={t("caption")} columns={columns} rows={staff} rowKey={(user) => user.id} />;
        }}
      </QueryState>
    </>
  );
}
