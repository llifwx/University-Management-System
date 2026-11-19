"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { Student, studentQueries } from "@/entities/student";
import { roleLabels, useSessionUser } from "@/entities/user";
import { ChangePasswordForm } from "@/features/change-password";
import { AvatarUpload, ContactDetailsForm } from "@/features/edit-profile";
import { LogoutEverywhereButton } from "@/features/logout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { QueryState } from "@/shared/ui/states";

type ProfileTranslator = ReturnType<typeof useTranslations<"pages.profile">>;

function yesNo(t: ProfileTranslator, value: boolean | null | undefined): string {
  if (value === null || value === undefined) return t("notSet");
  return value ? t("yes") : t("no");
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

function Details({ rows, t }: { rows: [string, string | number][]; t: ProfileTranslator }) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>{t("account.title")}</CardTitle>
        <CardDescription>{t("account.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Fields rows={rows} />
      </CardContent>
    </Card>
  );
}

function PersonalInformationCard({ student }: { student: Student }) {
  const t = useTranslations("pages.profile");
  const genderLabels: Record<string, string> = { MALE: t("genders.male"), FEMALE: t("genders.female") };
  const maritalStatusLabels: Record<string, string> = {
    SINGLE: t("maritalStatuses.single"),
    MARRIED: t("maritalStatuses.married"),
    DIVORCED: t("maritalStatuses.divorced"),
    WIDOWED: t("maritalStatuses.widowed"),
  };
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{t("personal.title")}</CardTitle>
        <CardDescription>{t("personal.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <ReadOnlyField id="last_name" label={t("personal.lastName")} value={student.last_name} />
        <ReadOnlyField id="first_name" label={t("personal.firstName")} value={student.first_name} />
        <ReadOnlyField id="patronymic" label={t("personal.patronymic")} value={student.patronymic ?? t("notSet")} />
        <ReadOnlyField id="birth_date" label={t("personal.birthDate")} value={student.birth_date ?? t("notSet")} />
        <ReadOnlyField id="gender" label={t("personal.gender")} value={student.gender ? genderLabels[student.gender] : t("notSet")} />
        <ReadOnlyField
          id="marital_status"
          label={t("personal.maritalStatus")}
          value={student.marital_status ? maritalStatusLabels[student.marital_status] : t("notSet")}
        />
        <ReadOnlyField id="nationality" label={t("personal.nationality")} value={student.nationality ?? t("notSet")} />
        <ReadOnlyField id="citizenship" label={t("personal.citizenship")} value={student.citizenship ?? t("notSet")} />
        <ReadOnlyField id="is_resident" label={t("personal.resident")} value={yesNo(t, student.is_resident)} />
      </CardContent>
    </Card>
  );
}

function AcademicRecordCard({ student }: { student: Student }) {
  const t = useTranslations("pages.profile");
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{t("academic.title")}</CardTitle>
        <CardDescription>{t("academic.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <ReadOnlyField id="student_id" label={t("academic.studentId")} value={student.student_number} />
        <ReadOnlyField id="role" label={t("academic.role")} value={roleLabels(t)["STUDENT"]} />
        <ReadOnlyField id="program" label={t("academic.program")} value={student.program ?? t("notSet")} />
        <ReadOnlyField id="year_level" label={t("academic.yearLevel")} value={student.year_level} />
        <ReadOnlyField id="admission_year" label={t("academic.admissionYear")} value={student.admission_year ?? t("notSet")} />
        <ReadOnlyField id="study_form" label={t("academic.studyForm")} value={student.study_form ?? t("notSet")} />
        <ReadOnlyField id="advisor" label={t("academic.advisor")} value={student.advisor ?? t("notSet")} />
        <ReadOnlyField id="needs_dormitory" label={t("academic.needsDormitory")} value={yesNo(t, student.needs_dormitory)} />
        <ReadOnlyField id="winter_admission" label={t("academic.winterAdmission")} value={yesNo(t, student.winter_admission)} />
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
  const t = useTranslations("pages.profile");
  const user = useSessionUser();
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <div className="grid max-w-6xl items-start gap-6 lg:grid-cols-2">
        <div className="grid gap-6">
          {user.role === "STUDENT" ? (
            <StudentProfile />
          ) : (
            <Details
              t={t}
              rows={[
                [t("fields.fullName"), user.full_name ?? t("notSet")],
                [t("fields.role"), roleLabels(t)[user.role]],
                [t("fields.title"), user.title ?? t("notSet")],
                [t("fields.department"), user.department ?? t("notSet")],
                [t("fields.email"), user.email],
                [t("fields.phone"), user.phone ?? t("notSet")],
                [t("fields.office"), user.office ?? t("notSet")],
              ]}
            />
          )}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>{t("sessions.title")}</CardTitle>
              <CardDescription>{t("sessions.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <LogoutEverywhereButton />
            </CardContent>
          </Card>
        </div>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>{t("password.title")}</CardTitle>
            <CardDescription>{t("password.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
