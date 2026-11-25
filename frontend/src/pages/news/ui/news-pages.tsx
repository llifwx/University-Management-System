"use client";

import { useQuery } from "@tanstack/react-query";
import { Newspaper, Paperclip, Plus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";

import { newsQueries } from "@/entities/news";
import { useSessionUser } from "@/entities/user";
import { NewsFormDialog, DeleteNewsButton } from "@/features/manage-news";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState, QueryState } from "@/shared/ui/states";

const DATE = { dateStyle: "medium", timeStyle: "short" } as const;

export function NewsListPage() {
  const t = useTranslations("pages.news");
  const format = useFormatter();
  const isAdmin = useSessionUser().role === "ADMIN";
  const news = useQuery(newsQueries.list());
  return (
    <>
      <PageHeader
        title={t("title")}
        actions={
          isAdmin && (
            <NewsFormDialog
              trigger={
                <Button>
                  <Plus aria-hidden />
                  {t("add")}
                </Button>
              }
            />
          )
        }
      />
      <QueryState query={news}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState icon={Newspaper} title={t("empty")} />
          ) : (
            <ul className="space-y-3">
              {rows.map((item) => (
                <li key={item.id}>
                  <Link href={`/news/${item.id}`} className="block">
                    <Card className="hover:bg-muted/50 p-4 transition-colors">
                      <div className="flex items-center gap-2">
                        <h2 className="min-w-0 flex-1 truncate font-medium">{item.title}</h2>
                        {item.attachment_url && <Paperclip className="text-muted-foreground size-4 shrink-0" aria-label={t("hasAttachment")} />}
                      </div>
                      <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{item.body}</p>
                      <time className="text-muted-foreground mt-2 block text-xs" dateTime={item.created_at}>
                        {format.dateTime(new Date(item.created_at), DATE)}
                      </time>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )
        }
      </QueryState>
    </>
  );
}

export function NewsDetailsPage({ newsId }: { newsId: number }) {
  const t = useTranslations("pages.news");
  const format = useFormatter();
  const isAdmin = useSessionUser().role === "ADMIN";
  const news = useQuery(newsQueries.detail(newsId));
  return (
    <QueryState query={news}>
      {(item) => {
        const href = item.attachment_url ? `/api/proxy${item.attachment_url}` : null;
        const isImage = item.attachment_content_type?.startsWith("image/") ?? false;
        return (
          <article>
            <PageHeader
              title={item.title}
              description={format.dateTime(new Date(item.created_at), DATE)}
              crumbs={[{ label: t("title"), href: "/news" }, { label: item.title }]}
              actions={
                isAdmin && (
                  <div className="flex gap-2">
                    <NewsFormDialog news={item} trigger={<Button variant="outline">{t("edit")}</Button>} />
                    <DeleteNewsButton news={item} />
                  </div>
                )
              }
            />
            <p className="break-words whitespace-pre-wrap">{item.body}</p>
            {href && isImage && (
              // eslint-disable-next-line @next/next/no-img-element -- same-origin BFF-proxied attachment
              <img src={href} alt={item.attachment_name ?? ""} className="mt-6 max-h-[32rem] rounded-lg" />
            )}
            {href && (
              <a href={href} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm underline">
                <Paperclip className="size-4 shrink-0" aria-hidden />
                {item.attachment_name ?? t("attachment")}
              </a>
            )}
          </article>
        );
      }}
    </QueryState>
  );
}
