"use client";

import { useQuery } from "@tanstack/react-query";

import { studentQueries } from "@/entities/student";
import { ROLE_LABELS, useSessionUser } from "@/entities/user";
import { Card, CardContent } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { QueryState } from "@/shared/ui/states";

function Details({ rows }: { rows: [string, string | number][] }) {
  return (
    <Card className="max-w-2xl shadow-sm">
      <CardContent className="p-6">
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted-foreground text-sm">{label}</dt>
              <dd className="font-medium break-words">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function StudentProfile() {
  const student = useQuery(studentQueries.me());
  return (
    <QueryState query={student}>
      {(data) => (
        <Details
          rows={[
            ["Full name", data.full_name],
            ["Student ID", data.student_id],
            ["Email", data.email],
            ["Academic program", data.program ?? "Not set"],
            ["Year level", data.year_level],
            ["Role", ROLE_LABELS.STUDENT],
          ]}
        />
      )}
    </QueryState>
  );
}

export function ProfilePage() {
  const user = useSessionUser();
  return (
    <>
      <PageHeader title="Profile" description="To change these details, contact a university administrator." />
      {user.role === "STUDENT" ? (
        <StudentProfile />
      ) : (
        <Details
          rows={[
            ["Email", user.email],
            ["User ID", user.id],
            ["Role", ROLE_LABELS[user.role]],
          ]}
        />
      )}
    </>
  );
}
