"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HelpCircle, Paperclip, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ChatMessage, MessageBubble, chatQueries, markMyThreadRead, sendMyMessage, useChatSocket } from "@/entities/chat";
import { Contact, DirectMessage, markMessagingThreadRead, messagingQueries, sendMessageTo, useMessagingSocket } from "@/entities/messaging";
import { useSessionUser } from "@/entities/user";
import { useApiErrorMessage } from "@/shared/api";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState, ErrorState, ListSkeleton } from "@/shared/ui/states";
import { Textarea } from "@/shared/ui/textarea";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
const MAX_BYTES = 15 * 1024 * 1024;

type Selection = { kind: "support" } | { kind: "contact"; userId: number };

export function MessagesPage({ wsUrl }: { wsUrl: string }) {
  const t = useTranslations("pages.messages");
  const getMessage = useApiErrorMessage();
  const user = useSessionUser();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Selection | null>(null);
  const [body, setBody] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const contacts = useQuery(messagingQueries.contacts());
  const contactRows = contacts.data?.items ?? [];

  // --- Support thread (admin chat), duplicated here from the floating widget's own data. ---
  const supportThread = useQuery(chatQueries.myThread());
  const supportMessagesQuery = useQuery(chatQueries.myMessages());

  // Inbox-style default: open whichever conversation (support or a contact) is most recent,
  // not always the pinned support row, so an unread reply from a teacher/student isn't hidden.
  // Reads `contacts.data`/`supportThread.data` directly (not the `?? []`-defaulted `contactRows`)
  // so this stays referentially stable while those queries are still pending.
  const active: Selection = useMemo(() => {
    if (selected) return selected;
    const topContact = contacts.data?.items[0];
    const supportTime = supportThread.data?.last_message_at;
    if (topContact?.last_message_at && (!supportTime || topContact.last_message_at > supportTime)) {
      return { kind: "contact", userId: topContact.user_id };
    }
    return { kind: "support" };
  }, [selected, contacts.data, supportThread.data]);
  const [supportMessages, setSupportMessages] = useState<ChatMessage[]>([]);
  const supportSeeded = useRef(false);
  useEffect(() => {
    if (supportMessagesQuery.data && !supportSeeded.current) {
      supportSeeded.current = true;
      setSupportMessages(supportMessagesQuery.data.items);
    }
  }, [supportMessagesQuery.data]);
  function appendSupportMessage(message: ChatMessage) {
    setSupportMessages((previous) => (previous.some((item) => item.id === message.id) ? previous : [...previous, message]));
  }
  const markSupportRead = useMutation({
    mutationFn: markMyThreadRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatQueries.all }),
  });
  useChatSocket(wsUrl, true, (event) => {
    appendSupportMessage(event.message);
    if (active.kind === "support") markSupportRead.mutate();
  });
  const sendSupport = useMutation({
    mutationFn: sendMyMessage,
    onSuccess: (message) => {
      appendSupportMessage(message);
      setBody("");
      setPendingFile(null);
    },
    onError: (error) => toast.error(getMessage(error)),
  });

  // --- Direct messages with a teacher or student contact. ---
  const [messagesByContact, setMessagesByContact] = useState<Record<number, DirectMessage[]>>({});
  const seededContacts = useRef(new Set<number>());
  const activeContactId = active.kind === "contact" ? active.userId : null;
  const contactMessagesQuery = useQuery({ ...messagingQueries.messagesWith(activeContactId ?? 0), enabled: activeContactId !== null });
  useEffect(() => {
    if (activeContactId !== null && contactMessagesQuery.data && !seededContacts.current.has(activeContactId)) {
      seededContacts.current.add(activeContactId);
      setMessagesByContact((previous) => ({ ...previous, [activeContactId]: contactMessagesQuery.data!.items }));
    }
  }, [activeContactId, contactMessagesQuery.data]);
  function appendContactMessage(counterpartId: number, message: DirectMessage) {
    setMessagesByContact((previous) => {
      const existing = previous[counterpartId] ?? [];
      if (existing.some((item) => item.id === message.id)) return previous;
      return { ...previous, [counterpartId]: [...existing, message] };
    });
  }
  const markContactRead = useMutation({
    mutationFn: markMessagingThreadRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: messagingQueries.all }),
  });
  useMessagingSocket(wsUrl, true, (event) => {
    appendContactMessage(event.counterpart_id, event.message);
    void queryClient.invalidateQueries({ queryKey: messagingQueries.contacts().queryKey });
    if (active.kind === "contact" && active.userId === event.counterpart_id) markContactRead.mutate(event.counterpart_id);
  });
  const sendToContact = useMutation({
    mutationFn: sendMessageTo,
    onSuccess: (message) => {
      if (activeContactId !== null) appendContactMessage(activeContactId, message);
      setBody("");
      setPendingFile(null);
      void queryClient.invalidateQueries({ queryKey: messagingQueries.contacts().queryKey });
    },
    onError: (error) =>
      toast.error(
        getMessage(error, {
          UNSUPPORTED_MEDIA_TYPE: t("errors.unsupportedFileType"),
          FILE_TOO_LARGE: t("errors.fileTooLarge"),
          NOT_A_TEACHER_OR_STUDENT_OF: t("errors.notEligible"),
        }),
      ),
  });

  useEffect(() => {
    if (active.kind === "support") markSupportRead.mutate();
    else markContactRead.mutate(active.userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- marking read is a side effect of the active conversation, not a dependency to react to
  }, [active]);

  const messages = useMemo<(ChatMessage | DirectMessage)[]>(
    () => (active.kind === "support" ? supportMessages : (messagesByContact[active.userId] ?? [])),
    [active, supportMessages, messagesByContact],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) return toast.error(t("errors.unsupportedFileType"));
    if (file.size > MAX_BYTES) return toast.error(t("errors.fileTooLarge"));
    setPendingFile(file);
  }

  function submit() {
    const trimmed = body.trim();
    if (!trimmed && !pendingFile) return;
    if (active.kind === "support") sendSupport.mutate({ body: trimmed || undefined, file: pendingFile });
    else sendToContact.mutate({ counterpartId: active.userId, body: trimmed || undefined, file: pendingFile });
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  const selectedContact = active.kind === "contact" ? contactRows.find((c) => c.user_id === active.userId) : null;
  const headerTitle = active.kind === "support" ? t("supportLabel") : (selectedContact?.display_name ?? selectedContact?.email ?? "");
  const headerSubtitle = active.kind === "support" ? undefined : selectedContact?.email;
  const sending = active.kind === "support" ? sendSupport.isPending : sendToContact.isPending;

  function contactRow(contact: Contact) {
    const isActive = active.kind === "contact" && active.userId === contact.user_id;
    return (
      <li key={contact.user_id}>
        <button
          type="button"
          onClick={() => setSelected({ kind: "contact", userId: contact.user_id })}
          className={cn("flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left text-sm transition-colors", isActive ? "bg-accent" : "hover:bg-accent/50")}
        >
          <span className="flex items-center justify-between gap-2">
            <span className="truncate font-medium">{contact.display_name ?? contact.email}</span>
            {contact.unread && <span className="size-2 shrink-0 rounded-full bg-red-500" aria-hidden />}
          </span>
          <span className="text-muted-foreground truncate text-xs">{contact.email}</span>
        </button>
      </li>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <PageHeader title={t("title")} description={t("description")} />
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border">
        <aside className="w-72 shrink-0 overflow-y-auto border-r">
          <ul className="space-y-1 p-2">
            <li>
              <button
                type="button"
                onClick={() => setSelected({ kind: "support" })}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                  active.kind === "support" ? "bg-accent" : "hover:bg-accent/50",
                )}
              >
                <HelpCircle className="size-4 shrink-0" aria-hidden />
                <span className="flex-1 truncate font-medium">{t("supportLabel")}</span>
                {(supportThread.data?.user_unread ?? false) && <span className="size-2 shrink-0 rounded-full bg-red-500" aria-hidden />}
              </button>
            </li>
          </ul>
          <div className="border-t" />
          {contacts.isError ? (
            <ErrorState error={contacts.error} onRetry={() => contacts.refetch()} />
          ) : contacts.isPending ? (
            <div className="p-3">
              <ListSkeleton />
            </div>
          ) : contactRows.length === 0 ? (
            <EmptyState title={t("empty.noConversations.title")} description={t("empty.noConversations.description")} />
          ) : (
            <ul className="space-y-1 p-2">{contactRows.map(contactRow)}</ul>
          )}
        </aside>
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold">{headerTitle}</p>
            {headerSubtitle && <p className="text-muted-foreground text-xs">{headerSubtitle}</p>}
          </div>
          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
            {messages.length === 0 && <p className="text-muted-foreground mt-8 text-center text-sm">{t("empty.noMessages")}</p>}
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} isMine={message.sender_id === user.id} />
            ))}
          </div>
          <div className="border-t p-3">
            {pendingFile && (
              <div className="bg-muted mb-2 flex items-center justify-between rounded-md px-2 py-1 text-xs">
                <span className="truncate">{pendingFile.name}</span>
                <button type="button" onClick={() => setPendingFile(null)} aria-label={t("removeAttachment")}>
                  ×
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <Button type="button" variant="ghost" size="icon" className="size-9 shrink-0" onClick={() => fileInputRef.current?.click()} aria-label={t("attachFile")}>
                <Paperclip className="size-4" aria-hidden />
              </Button>
              <Textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder={t("composerPlaceholder")}
                className="max-h-32 min-h-9 flex-1 resize-none py-2"
                rows={1}
              />
              <Button type="button" size="icon" className="size-9 shrink-0" onClick={submit} disabled={sending || (!body.trim() && !pendingFile)} aria-label={t("send")}>
                <Send className="size-4" aria-hidden />
              </Button>
            </div>
            <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES.join(",")} className="hidden" onChange={handleFileChange} />
          </div>
        </section>
      </div>
    </div>
  );
}
