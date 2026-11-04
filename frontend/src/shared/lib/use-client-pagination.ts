"use client";

import { useState } from "react";

/** Pages an in-memory list. The current page self-corrects when filters shrink the list. */
export function useClientPagination<T>(items: T[], pageSize = 20) {
  const [requestedPage, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  return {
    page,
    pageCount,
    total: items.length,
    pageItems: items.slice((page - 1) * pageSize, page * pageSize),
    setPage,
  };
}
