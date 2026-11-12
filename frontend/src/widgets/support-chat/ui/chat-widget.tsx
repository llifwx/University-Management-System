"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HelpCircle, Maximize2, Minimize2, Paperclip, Send, X } from "lucide-react";
import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ChatMessage, MessageBubble, chatQueries, markMyThreadRead, sendMyMessage, useChatSocket } from "@/entities/chat";
import { useSessionUser } from "@/entities/user";
import { getErrorMessage } from "@/shared/api";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
const MAX_BYTES = 15 * 1024 * 1024;
const MESSAGES = {
  UNSUPPORTED_MEDIA_TYPE: "Attach a JPEG, PNG, WebP, GIF image or PDF.",
  FILE_TOO_LARGE: "Attachments must be 15 MB or smaller.",
};

export function ChatWidget({ wsUrl }: { wsUrl: string }) {
  const user = useSessionUser();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [wsUnread, setWsUnread] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const seeded = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const myThread = useQuery({ ...chatQueries.myThread(), enabled: user.role !== "ADMIN" });
  const myMessages = useQuery({ ...chatQueries.myMessages(), enabled: user.role !== "ADMIN" });

  useEffect(() => {
    if (myMessages.data && !seeded.current) {
      seeded.current = true;
      setMessages(myMessages.data.items);
    }
  }, [myMessages.data]);

  const hasUnread = wsUnread || (myThread.data?.user_unread ?? false);

  function appendMessage(message: ChatMessage) {
    setMessages((previous) => (previous.some((item) => item.id === message.id) ? previous : [...previous, message]));
  }

  const markRead = useMutation({
    mutationFn: markMyThreadRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatQueries.all }),
  });

  useChatSocket(wsUrl, user.role !== "ADMIN", (event) => {
    appendMessage(event.message);
    if (open) markRead.mutate();
    else setWsUnread(true);
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function handleOpen() {
    setOpen(true);
    setWsUnread(false);
    markRead.mutate();
  }

  const send = useMutation({
    mutationFn: sendMyMessage,
    onSuccess: (message) => {
      appendMessage(message);
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

  function submitMessage() {
    const trimmed = body.trim();
    if (!trimmed && !pendingFile) return;
    send.mutate({ body: trimmed || undefined, file: pendingFile });
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  }

  if (user.role === "ADMIN") return null;

  return (
    <>
      <Button
        type="button"
        size="icon"
        className="fixed right-4 bottom-4 z-40 size-14 rounded-full shadow-lg"
        onClick={handleOpen}
        aria-label="Contact administration"
      >
        <HelpCircle className="size-6" aria-hidden />
        {hasUnread && <span className="border-background absolute top-0 right-0 size-3 rounded-full border-2 bg-red-500" aria-hidden />}
      </Button>
      {open && (
        <div
          role="dialog"
          aria-label="Support chat"
          className={cn(
            "bg-card fixed z-50 flex flex-col overflow-hidden rounded-xl border shadow-2xl",
            fullscreen
              ? "inset-4 sm:inset-8"
              : "right-4 bottom-4 h-[min(600px,calc(100vh-2rem))] w-[min(380px,calc(100vw-2rem))]",
          )}
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">Contact administration</p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setFullscreen((value) => !value)}
                aria-label={fullscreen ? "Exit fullscreen" : "Expand to fullscreen"}
              >
                {fullscreen ? <Minimize2 className="size-4" aria-hidden /> : <Maximize2 className="size-4" aria-hidden />}
              </Button>
              <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => setOpen(false)} aria-label="Close chat">
                <X className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3">
            {messages.length === 0 && (
              <p className="text-muted-foreground mt-8 text-center text-sm">Ask the administration a question, and they&apos;ll reply here.</p>
            )}
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} isMine={message.sender_id === user.id} />
            ))}
          </div>
          <div className="border-t p-3">
            {pendingFile && (
              <div className="bg-muted mb-2 flex items-center justify-between rounded-md px-2 py-1 text-xs">
                <span className="truncate">{pendingFile.name}</span>
                <button type="button" onClick={() => setPendingFile(null)} aria-label="Remove attachment">
                  <X className="size-3.5" aria-hidden />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <Button type="button" variant="ghost" size="icon" className="size-9 shrink-0" onClick={() => fileInputRef.current?.click()} aria-label="Attach a file or photo">
                <Paperclip className="size-4" aria-hidden />
              </Button>
              <Textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="Type your question…"
                className="max-h-24 min-h-9 flex-1 resize-none py-2"
                rows={1}
              />
              <Button
                type="button"
                size="icon"
                className="size-9 shrink-0"
                onClick={submitMessage}
                disabled={send.isPending || (!body.trim() && !pendingFile)}
                aria-label="Send"
              >
                <Send className="size-4" aria-hidden />
              </Button>
            </div>
            <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES.join(",")} className="hidden" onChange={handleFileChange} />
          </div>
        </div>
      )}
    </>
  );
}
