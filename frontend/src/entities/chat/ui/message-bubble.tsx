import { Paperclip } from "lucide-react";

import { cn } from "@/shared/lib/utils";

import type { ChatMessage } from "../model/types";

export function MessageBubble({ message, isMine }: { message: ChatMessage; isMine: boolean }) {
  const isImage = message.attachment_content_type?.startsWith("image/") ?? false;
  const attachmentHref = message.attachment_url ? `/api/proxy${message.attachment_url}` : null;

  return (
    <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
          isMine ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {attachmentHref && isImage && (
          <a href={attachmentHref} target="_blank" rel="noreferrer" className="mb-1 block">
            {/* eslint-disable-next-line @next/next/no-img-element -- same-origin BFF-proxied attachment */}
            <img src={attachmentHref} alt={message.attachment_name ?? "Attachment"} className="max-h-48 rounded-lg object-cover" />
          </a>
        )}
        {attachmentHref && !isImage && (
          <a
            href={attachmentHref}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "mb-1 flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs underline",
              isMine ? "border-primary-foreground/30" : "border-border",
            )}
          >
            <Paperclip className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{message.attachment_name ?? "Attachment"}</span>
          </a>
        )}
        {message.body && <p className="break-words whitespace-pre-wrap">{message.body}</p>}
        <p className={cn("mt-1 text-[11px] opacity-70", isMine ? "text-primary-foreground" : "text-muted-foreground")}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}
