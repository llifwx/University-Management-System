"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Send } from "lucide-react";
import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  ChatMessage,
  MessageBubble,
  chatQueries,
  markThreadRead,
  replyToThread,
  useChatSocket,
} from "@/entities/chat";
import { useSessionUser } from "@/entities/user";
import { getErrorMessage } from "@/shared/api";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState, ErrorState, ListSkeleton } from "@/shared/ui/states";
import { Textarea } from "@/shared/ui/textarea";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
const MAX_BYTES = 15 * 1024 * 1024;
const MESSAGES = {
  UNSUPPORTED_MEDIA_TYPE: "Attach a JPEG, PNG, WebP, GIF image or PDF.",
  FILE_TOO_LARGE: "Attachments must be 15 MB or smaller.",
};

export function AdminSupportChatPage({ wsUrl }: { wsUrl: string }) {
  const user = useSessionUser();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messagesByThread, setMessagesByThread] = useState<Record<number, ChatMessage[]>>({});
  const seededThreads = useRef(new Set<number>());
  const [body, setBody] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const threads = useQuery(chatQueries.threads());
  const rows = threads.data?.items ?? [];
  // No explicit pick yet: default to the top of the inbox instead of an effect-driven setState.
  const activeId = selectedId ?? rows[0]?.id ?? null;

  const selectedMessages = useQuery({ ...chatQueries.threadMessages(activeId ?? 0), enabled: activeId !== null });

  useEffect(() => {
    if (activeId !== null && selectedMessages.data && !seededThreads.current.has(activeId)) {
      seededThreads.current.add(activeId);
      setMessagesByThread((previous) => ({ ...previous, [activeId]: selectedMessages.data!.items }));
    }
  }, [activeId, selectedMessages.data]);

  function appendMessage(threadId: number, message: ChatMessage) {
    setMessagesByThread((previous) => {
      const existing = previous[threadId] ?? [];
      if (existing.some((item) => item.id === message.id)) return previous;
      return { ...previous, [threadId]: [...existing, message] };
    });
  }

  const markRead = useMutation({
    mutationFn: markThreadRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatQueries.all }),
  });

  useChatSocket(wsUrl, true, (event) => {
    appendMessage(event.thread.id, event.message);
    void queryClient.invalidateQueries({ queryKey: chatQueries.threads().queryKey });
    if (event.thread.id === activeId) markRead.mutate(activeId);
  });

  useEffect(() => {
    if (activeId !== null) markRead.mutate(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- marking read is a side effect of selection, not a dependency to react to
  }, [activeId]);

  const messages = useMemo(() => (activeId !== null ? messagesByThread[activeId] ?? [] : []), [activeId, messagesByThread]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const reply = useMutation({
    mutationFn: replyToThread,
    onSuccess: (message) => {
      appendMessage(message.thread_id, message);
      setBody("");
      setPendingFile(null);
    },
    onError: (error) => toast.error(getErrorMessage(error, MESSAGES)),
  });

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) return toast.error(MESSAGES.UNSUPPORTED_MEDIA_TYPE);
    if (file.size > MAX_BYTES) return toast.error(MESSAGES.FILE_TOO_LARGE);
    setPendingFile(file);
  }

  function submitReply() {
    const trimmed = body.trim();
    if (activeId === null || (!trimmed && !pendingFile)) return;
    reply.mutate({ threadId: activeId, body: trimmed || undefined, file: pendingFile });
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitReply();
    }
  }

  const selectedThread = rows.find((thread) => thread.id === activeId) ?? null;

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <PageHeader title="Support chat" description="Questions students and teachers have sent to administration." />
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border">
        <aside className="w-72 shrink-0 overflow-y-auto border-r">
          {threads.isError ? (
            <ErrorState error={threads.error} onRetry={() => threads.refetch()} />
          ) : threads.isPending ? (
            <div className="p-3">
              <ListSkeleton />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState title="No conversations yet" description="Questions will show up here as they come in." />
          ) : (
            <ul className="space-y-1 p-2">
              {rows.map((thread) => (
                <li key={thread.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(thread.id)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left text-sm transition-colors",
                      thread.id === activeId ? "bg-accent" : "hover:bg-accent/50",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{thread.display_name ?? thread.user_email}</span>
                      {thread.admin_unread && <span className="size-2 shrink-0 rounded-full bg-red-500" aria-hidden />}
                    </span>
                    <span className="text-muted-foreground truncate text-xs">{thread.user_email}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
        <section className="flex min-w-0 flex-1 flex-col">
          {selectedThread === null ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState title="Select a conversation" description="Pick a thread on the left to read and reply." />
            </div>
          ) : (
            <>
              <div className="border-b px-4 py-3">
                <p className="text-sm font-semibold">{selectedThread.display_name ?? selectedThread.user_email}</p>
                <p className="text-muted-foreground text-xs">{selectedThread.user_email}</p>
              </div>
              <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} isMine={message.sender_id === user.id} />
                ))}
              </div>
              <div className="border-t p-3">
                {pendingFile && (
                  <div className="bg-muted mb-2 flex items-center justify-between rounded-md px-2 py-1 text-xs">
                    <span className="truncate">{pendingFile.name}</span>
                    <button type="button" onClick={() => setPendingFile(null)} aria-label="Remove attachment">
                      ×
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Attach a file or photo"
                  >
                    <Paperclip className="size-4" aria-hidden />
                  </Button>
                  <Textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    onKeyDown={handleComposerKeyDown}
                    placeholder="Type your reply…"
                    className="max-h-32 min-h-9 flex-1 resize-none py-2"
                    rows={1}
                  />
                  <Button
                    type="button"
                    size="icon"
                    className="size-9 shrink-0"
                    onClick={submitReply}
                    disabled={reply.isPending || (!body.trim() && !pendingFile)}
                    aria-label="Send"
                  >
                    <Send className="size-4" aria-hidden />
                  </Button>
                </div>
                <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES.join(",")} className="hidden" onChange={handleFileChange} />
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
