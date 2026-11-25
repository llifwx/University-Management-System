"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Material, materialQueries } from "@/entities/materials";
import { useApiErrorMessage } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";

import { deleteMaterial } from "../api/material-mutations";

export function DeleteMaterialButton({ material }: { material: Material }) {
  const t = useTranslations("features.manageMaterials");
  const getMessage = useApiErrorMessage();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => deleteMaterial(material.id),
    onSuccess: async () => {
      toast.success(t("toast.deleted"));
      await queryClient.invalidateQueries({ queryKey: materialQueries.all });
    },
  });
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon" aria-label={t("delete")}>
          <Trash2 className="size-4" aria-hidden />
        </Button>
      }
      title={t("deleteConfirmTitle", { title: material.title })}
      description={t("deleteConfirmDescription")}
      confirmLabel={t("delete")}
      isPending={mutation.isPending}
      error={mutation.isError ? getMessage(mutation.error) : undefined}
      onConfirm={(close) => mutation.mutate(undefined, { onSuccess: close })}
    />
  );
}
