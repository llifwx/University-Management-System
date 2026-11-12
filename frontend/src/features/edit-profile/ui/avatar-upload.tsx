"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Student, studentQueries } from "@/entities/student";
import { getErrorMessage } from "@/shared/api";
import { Button } from "@/shared/ui/button";

import { uploadMyPhoto } from "../api/profile-mutations";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MESSAGES = { UNSUPPORTED_MEDIA_TYPE: "Upload a JPEG, PNG, or WebP image.", FILE_TOO_LARGE: "Photo must be 5 MB or smaller." };

function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AvatarUpload({ student }: { student: Student }) {
  const queryClient = useQueryClient();
  // Same query key as the page's own fetch, so dataUpdatedAt ticks forward the instant the upload invalidates it.
  const { dataUpdatedAt } = useQuery(studentQueries.me());
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const mutation = useMutation({
    mutationFn: uploadMyPhoto,
    onSuccess: async () => {
      toast.success("Photo updated.");
      setPendingFile(null);
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      await queryClient.invalidateQueries({ queryKey: studentQueries.all });
    },
    onError: (error) => toast.error(getErrorMessage(error, MESSAGES)),
  });

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) return toast.error(MESSAGES.UNSUPPORTED_MEDIA_TYPE);
    if (file.size > MAX_BYTES) return toast.error(MESSAGES.FILE_TOO_LARGE);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setPendingFile(file);
  }

  function cancel() {
    setPendingFile(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }

  // A cache-busting query param forces the browser to refetch the image instead of reusing the old bytes at the same URL.
  const savedPhotoSrc = student.photo_url ? `/api/proxy${student.photo_url}?v=${dataUpdatedAt}` : null;
  const displaySrc = previewUrl ?? savedPhotoSrc;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-24 w-24 shrink-0">
        <div className="bg-muted text-muted-foreground flex h-24 w-24 items-center justify-center overflow-hidden rounded-full text-2xl font-semibold">
          {displaySrc ? (
            // The browser only ever talks to the same-origin BFF proxy; a plain <img> needs no further auth wiring.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displaySrc} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(student.full_name)
          )}
        </div>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="absolute -right-1 -bottom-1 h-8 w-8 rounded-full shadow"
          onClick={() => inputRef.current?.click()}
          disabled={mutation.isPending}
          aria-label="Change photo"
        >
          <Camera className="h-4 w-4" />
        </Button>
        <input ref={inputRef} type="file" accept={ACCEPTED_TYPES.join(",")} className="hidden" onChange={handleChange} />
      </div>
      {pendingFile && (
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={() => mutation.mutate(pendingFile)} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={cancel} disabled={mutation.isPending}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
