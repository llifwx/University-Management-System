"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { pickCurrentSemester, semesterQueries } from "@/entities/semester";

const ALL = "all";

/** The chosen semester lives in the URL, so views can be shared and survive a reload. */
export function useSemesterParam({ defaultToAll = false }: { defaultToAll?: boolean } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = useQuery(semesterQueries.list());
  const semesters = query.data;
  const param = searchParams?.get("semester");

  const fallback = defaultToAll ? undefined : semesters && pickCurrentSemester(semesters)?.semester_id;
  const semesterId = param === ALL ? undefined : param ? Number(param) : fallback;

  const setSemesterId = useCallback(
    (id: number | undefined) => {
      const next = new URLSearchParams(searchParams ?? undefined);
      next.set("semester", id === undefined ? ALL : String(id));
      router.replace(`${pathname}?${next}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { semesters, semesterId, setSemesterId, query };
}
