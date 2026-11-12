"use client";

import { useQuery } from "@tanstack/react-query";

import { Student, studentQueries } from "@/entities/student";
import { ROLE_LABELS, useSessionUser } from "@/entities/user";
import { ChangePasswordForm } from "@/features/change-password";
import { AvatarUpload, ContactDetailsForm } from "@/features/edit-profile";
import { LogoutEverywhereButton } from "@/features/logout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { QueryState } from "@/shared/ui/states";

const GENDER_LABELS: Record<string, string> = { MALE: "Male", FEMALE: "Female" };
const MARITAL_STATUS_LABELS: Record<string, string> = {
  SINGLE: "Single",
  MARRIED: "Married",
  DIVORCED: "Divorced",
  WIDOWED: "Widowed",
};

function yesNo(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return "Not set";
  return value ? "Yes" : "No";
}

function ReadOnlyField({ id, label, value }: { id: string; label: string; value: string | number }) {
  return (
    <FormField id={id} label={label}>
      <Input id={id} value={value} readOnly tabIndex={-1} className="bg-muted/40 cursor-default" />
    </FormField>
  );
}

function Fields({ rows }: { rows: [string, string | number][] }) {
  return (
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-muted-foreground text-sm">{label}</dt>
          <dd className="font-medium break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Details({ rows }: { rows: [string, string | number][] }) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>To change these details, contact a university administrator.</CardDescription>
      </CardHeader>
      <CardContent>
        <Fields rows={rows} />
      </CardContent>
    </Card>
  );
}

function PersonalInformationCard({ student }: { student: Student }) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Personal information</CardTitle>
        <CardDescription>Set by a university administrator.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <ReadOnlyField id="last_name" label="Last name" value={student.last_name} />
        <ReadOnlyField id="first_name" label="First name" value={student.first_name} />
        <ReadOnlyField id="patronymic" label="Patronymic" value={student.patronymic ?? "Not set"} />
        <ReadOnlyField id="birth_date" label="Date of birth" value={student.birth_date ?? "Not set"} />
        <ReadOnlyField id="gender" label="Gender" value={student.gender ? GENDER_LABELS[student.gender] : "Not set"} />
        <ReadOnlyField
          id="marital_status"
          label="Marital status"
          value={student.marital_status ? MARITAL_STATUS_LABELS[student.marital_status] : "Not set"}
        />
        <ReadOnlyField id="nationality" label="Nationality" value={student.nationality ?? "Not set"} />
        <ReadOnlyField id="citizenship" label="Citizenship" value={student.citizenship ?? "Not set"} />
        <ReadOnlyField id="is_resident" label="Resident" value={yesNo(student.is_resident)} />
      </CardContent>
    </Card>
  );
}

function AcademicRecordCard({ student }: { student: Student }) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Academic record</CardTitle>
        <CardDescription>Set by a university administrator.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <ReadOnlyField id="student_id" label="Student ID" value={student.student_number} />
        <ReadOnlyField id="role" label="Role" value={ROLE_LABELS.STUDENT} />
        <ReadOnlyField id="program" label="Academic program" value={student.program ?? "Not set"} />
        <ReadOnlyField id="year_level" label="Year level" value={student.year_level} />
        <ReadOnlyField id="admission_year" label="Admission year" value={student.admission_year ?? "Not set"} />
        <ReadOnlyField id="study_form" label="Study form" value={student.study_form ?? "Not set"} />
        <ReadOnlyField id="advisor" label="Advisor" value={student.advisor ?? "Not set"} />
        <ReadOnlyField id="needs_dormitory" label="Needs dormitory" value={yesNo(student.needs_dormitory)} />
        <ReadOnlyField id="winter_admission" label="Winter admission" value={yesNo(student.winter_admission)} />
      </CardContent>
    </Card>
  );
}

function StudentProfile() {
  const student = useQuery(studentQueries.me());
  return (
    <QueryState query={student}>
      {(data) => (
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardContent className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-start">
              <AvatarUpload student={data} />
              <div className="flex-1">
                <h2 className="text-lg font-semibold">{data.full_name}</h2>
                <p className="text-muted-foreground text-sm">{data.email}</p>
              </div>
            </CardContent>
          </Card>
          <PersonalInformationCard student={data} />
          <AcademicRecordCard student={data} />
          <ContactDetailsForm student={data} />
        </div>
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
