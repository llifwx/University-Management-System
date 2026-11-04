"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Shield } from "lucide-react";

import { ROLE_LABELS, User, useSessionUser, userQueries } from "@/entities/user";
import { CreateStaffDialog, ResetPasswordDialog, StaffActiveSwitch } from "@/features/manage-staff";
import { Button } from "@/shared/ui/button";
import { Column, DataTable } from "@/shared/ui/data-table";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState, QueryState } from "@/shared/ui/states";

export function StaffManagementPage() {
  const me = useSessionUser();
  const users = useQuery(userQueries.list());
  const columns: Column<User>[] = [
    { header: "Email", cell: (user) => <span className="font-medium break-all">{user.email}</span> },
    { header: "User ID", cell: (user) => user.id },
    { header: "Role", cell: (user) => ROLE_LABELS[user.role] },
    { header: "Active", cell: (user) => <StaffActiveSwitch user={user} disabled={user.id === me.id} /> },
    {
      header: "Actions",
      cell: (user) => (
        <ResetPasswordDialog
          user={user}
          trigger={
            <Button variant="ghost" size="sm">
              Change password
            </Button>
          }
        />
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Staff"
        description="Teacher and administrator accounts."
        actions={
          <CreateStaffDialog
            trigger={
              <Button>
                <Plus aria-hidden />
                Add staff
              </Button>
            }
          />
        }
      />
      <QueryState query={users}>
        {(rows) => {
          const staff = rows.filter((user) => user.role !== "STUDENT");
          return staff.length === 0 ? <EmptyState icon={Shield} title="No staff accounts" /> : <DataTable caption="Staff accounts" columns={columns} rows={staff} rowKey={(user) => user.id} />;
        }}
      </QueryState>
    </>
  );
}
