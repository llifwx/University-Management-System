"use client";

import { useQuery } from "@tanstack/react-query";

import { studentQueries } from "@/entities/student";
import { ROLE_LABELS, useSessionUser } from "@/entities/user";
import { ChangePasswordForm } from "@/features/change-password";
import { LogoutEverywhereButton } from "@/features/logout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { QueryState } from "@/shared/ui/states";

function Details({ rows }: { rows: [string, string | number][] }) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>To change these details, contact a university administrator.</CardDescription>
      </CardHeader>
      <CardContent>
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
      <PageHeader title="Profile" description="Your account details and sign-in security." />
      <div className="grid max-w-6xl items-start gap-6 lg:grid-cols-2">
        <div className="grid gap-6">
          {user.role === "STUDENT" ? (
            <StudentProfile />
          ) : (
            <Details
              rows={[
                ["Full name", user.full_name ?? "Not set"],
                ["Role", ROLE_LABELS[user.role]],
                ["Title", user.title ?? "Not set"],
                ["Department", user.department ?? "Not set"],
                ["Email", user.email],
                ["Phone", user.phone ?? "Not set"],
                ["Office", user.office ?? "Not set"],
              ]}
            />
          )}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Sessions</CardTitle>
              <CardDescription>Lost a device or signed in on a shared computer? End every session at once, including this one.</CardDescription>
            </CardHeader>
            <CardContent>
              <LogoutEverywhereButton />
            </CardContent>
          </Card>
        </div>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Changing it keeps you signed in here and signs out your other devices.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
