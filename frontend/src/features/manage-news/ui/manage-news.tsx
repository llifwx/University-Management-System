"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { FormEvent, ReactNode } from "react";
import { toast } from "sonner";

import { News, newsQueries } from "@/entities/news";
import { apiRequest, apiUpload, useApiErrorMessage } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { FormDialog, FormSubmit } from "@/shared/ui/form-dialog";
import { FormError, FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";

const ACCEPT = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.pptx";

function NewsForm({ news, onDone }: { news?: News; onDone: () => void }) {
  const t = useTranslations("features.manageNews");
  const getMessage = useApiErrorMessage();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (form: FormData) => {
      const file = form.get("file");
      const fields: Record<string, string> = { title: String(form.get("title")), body: String(form.get("body")) };
      if (form.get("remove_attachment")) fields.remove_attachment = "true";
      return apiUpload<News>(news ? `/news/${news.id}` : "/news", file instanceof File && file.size > 0 ? file : null, undefined, fields, news ? "PATCH" : "POST");
    },
    onSuccess: async () => {
      toast.success(news ? t("toast.updated") : t("toast.created"));
      await queryClient.invalidateQueries({ queryKey: newsQueries.all });
      onDone();
    },
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate(new FormData(event.currentTarget));
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormField id="news-title" label={t("fields.title")}>
        <Input id="news-title" name="title" required maxLength={200} defaultValue={news?.title} />
      </FormField>
      <FormField id="news-body" label={t("fields.body")}>
        <Textarea id="news-body" name="body" required maxLength={20000} rows={8} defaultValue={news?.body} />
      </FormField>
      <FormField id="news-file" label={news?.attachment_url ? t("fields.replaceFile") : t("fields.file")} hint={t("fileHint")}>
        <Input id="news-file" name="file" type="file" accept={ACCEPT} />
      </FormField>
      {news?.attachment_url && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="remove_attachment" className="size-4" />
          {t("fields.removeFile", { name: news.attachment_name ?? "" })}
        </label>
      )}
      {mutation.isError && <FormError message={getMessage(mutation.error)} />}
      <FormSubmit isPending={mutation.isPending} label={news ? t("save") : t("publish")} />
    </form>
  );
}

/** Without `news` it creates a new item; with it, edits that item. */
export function NewsFormDialog({ news, trigger }: { news?: News; trigger: ReactNode }) {
  const t = useTranslations("features.manageNews");
  return (
    <FormDialog trigger={trigger} title={news ? t("editDialogTitle") : t("dialogTitle")}>
      {(close) => <NewsForm news={news} onDone={close} />}
    </FormDialog>
  );
}

export function DeleteNewsButton({ news }: { news: News }) {
  const t = useTranslations("features.manageNews");
  const getMessage = useApiErrorMessage();
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: () => apiRequest<{ message: string }>(`/news/${news.id}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success(t("toast.deleted"));
      router.push("/news");
      await queryClient.invalidateQueries({ queryKey: newsQueries.all });
    },
  });
  return (
    <ConfirmDialog
      trigger={<Button variant="outline">{t("delete")}</Button>}
      title={t("deleteConfirmTitle", { title: news.title })}
      description={t("deleteConfirmDescription")}
      confirmLabel={t("delete")}
      isPending={mutation.isPending}
      error={mutation.isError ? getMessage(mutation.error) : undefined}
      onConfirm={(close) => mutation.mutate(undefined, { onSuccess: close })}
    />
  );
}
