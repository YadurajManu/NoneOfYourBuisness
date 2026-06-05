import { FormEvent, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Link2, MessageCircle, Search, Send, ShieldAlert, UserRoundPlus } from "lucide-react";
import { Link } from "react-router-dom";
import {
  getDirectConversation,
  listMessageContextDocuments,
  listMessageContextPatients,
  listDirectConversations,
  markDirectConversationRead,
  searchMessageUsers,
  sendDirectMessage,
  startDirectConversation,
} from "@/lib/api/client";
import type { UserRole } from "@/lib/api/types";
import { useAuth } from "@/portal/auth-context";
import { Panel } from "@/portal/panel";
import { PortalShell } from "@/portal/portal-shell";

const inputClass =
  "h-12 w-full rounded-2xl border border-white/10 bg-background/70 px-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15";
const textareaClass =
  "min-h-24 w-full rounded-2xl border border-white/10 bg-background/70 px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15";

type DirectoryUser = {
  id: string;
  email: string;
  role: UserRole;
  displayName: string | null;
};

type MessagePriority = "NORMAL" | "IMPORTANT" | "URGENT";

function asArray<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function formatRole(role: string) {
  return role.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function initials(label: string) {
  return label
    .split(/[ @._-]+/)
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function userLabel(user: Record<string, unknown>) {
  return String(user.displayName || user.email || "User");
}

function parseDirectoryUser(row: Record<string, unknown>): DirectoryUser {
  return {
    id: String(row.id || ""),
    email: String(row.email || ""),
    role: String(row.role || "DOCTOR") as UserRole,
    displayName: row.displayName ? String(row.displayName) : null,
  };
}

function patientLabel(patient: Record<string, unknown>) {
  const resource = asRecord(patient.fhirResource);
  const names = asArray(resource.name).map(asRecord);
  const firstName = names[0] || {};
  const text = firstName.text ? String(firstName.text) : "";
  const given = asArray<string>(firstName.given).join(" ");
  const family = firstName.family ? String(firstName.family) : "";
  const fullName = text || [given, family].filter(Boolean).join(" ");
  return fullName || `Patient ${String(patient.id || "").slice(0, 8)}`;
}

function documentLabel(document: Record<string, unknown>) {
  const metadata = asRecord(document.metadata);
  const fileName = metadata.fileName || metadata.originalName || metadata.name;
  return String(fileName || document.type || "Clinical document");
}

function patientWorkspacePath(role: UserRole | undefined, patientId: string) {
  if (role === "DOCTOR") return `/portal/doctor/patient/${patientId}`;
  if (role === "SPECIALIST") return `/portal/specialist/patient/${patientId}`;
  if (role === "PATIENT") return "/portal";
  if (role === "FAMILY_MEMBER") return "/portal";
  return `/portal/patient-profile/${patientId}`;
}

function otherParticipant(conversation: Record<string, unknown>, currentUserId: string) {
  const participants = asArray(conversation.participants)
    .map((row) => asRecord(asRecord(row).user))
    .filter((row) => String(row.id || "") !== currentUserId);
  return participants[0] || {};
}

function myParticipant(conversation: Record<string, unknown>, currentUserId: string) {
  return asArray(conversation.participants)
    .map(asRecord)
    .find((row) => String(row.userId || asRecord(row.user).id || "") === currentUserId);
}

function hasUnreadMessage(conversation: Record<string, unknown>, currentUserId: string) {
  const latest = asRecord(asArray(conversation.messages)[0]);
  if (!latest.createdAt || String(latest.senderUserId || asRecord(latest.sender).id || "") === currentUserId) {
    return false;
  }

  const participant = asRecord(myParticipant(conversation, currentUserId));
  const lastReadAt = participant.lastReadAt ? new Date(String(participant.lastReadAt)).getTime() : 0;
  return new Date(String(latest.createdAt)).getTime() > lastReadAt;
}

export default function PortalMessagesPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [initialMessage, setInitialMessage] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const deferredPatientSearch = useDeferredValue(patientSearch);
  const [initialPatientId, setInitialPatientId] = useState("");
  const [initialDocumentId, setInitialDocumentId] = useState("");
  const [initialPriority, setInitialPriority] = useState<MessagePriority>("NORMAL");
  const [replyPatientId, setReplyPatientId] = useState("");
  const [replyDocumentId, setReplyDocumentId] = useState("");
  const [replyPriority, setReplyPriority] = useState<MessagePriority>("NORMAL");

  const usersQuery = useQuery({
    queryKey: ["messages", "users", deferredSearch],
    queryFn: () => searchMessageUsers(deferredSearch),
  });
  const conversationsQuery = useQuery({
    queryKey: ["messages", "conversations"],
    queryFn: listDirectConversations,
    refetchInterval: 10000,
  });
  const patientsQuery = useQuery({
    queryKey: ["messages", "context", "patients", deferredPatientSearch],
    queryFn: () => listMessageContextPatients(deferredPatientSearch),
  });
  const initialDocumentsQuery = useQuery({
    queryKey: ["messages", "context", "documents", initialPatientId],
    queryFn: () => listMessageContextDocuments(initialPatientId),
    enabled: Boolean(initialPatientId),
  });
  const replyDocumentsQuery = useQuery({
    queryKey: ["messages", "context", "documents", replyPatientId],
    queryFn: () => listMessageContextDocuments(replyPatientId),
    enabled: Boolean(replyPatientId),
  });
  const selectedConversationQuery = useQuery({
    queryKey: ["messages", "conversations", selectedConversationId],
    queryFn: () => getDirectConversation(selectedConversationId as string),
    enabled: Boolean(selectedConversationId),
    refetchInterval: selectedConversationId ? 8000 : false,
  });

  const users = useMemo(
    () => asArray(usersQuery.data).map((row) => parseDirectoryUser(asRecord(row))),
    [usersQuery.data],
  );
  const conversations = useMemo(
    () => asArray(conversationsQuery.data).map(asRecord),
    [conversationsQuery.data],
  );
  const patients = useMemo(
    () => asArray(patientsQuery.data).map(asRecord),
    [patientsQuery.data],
  );
  const initialDocuments = useMemo(
    () => asArray(initialDocumentsQuery.data).map(asRecord),
    [initialDocumentsQuery.data],
  );
  const replyDocuments = useMemo(
    () => asArray(replyDocumentsQuery.data).map(asRecord),
    [replyDocumentsQuery.data],
  );
  const selectedConversation = asRecord(selectedConversationQuery.data);
  const messages = asArray(selectedConversation.messages);
  const selectedRecipient = users.find((row) => row.id === selectedRecipientId);

  useEffect(() => {
    if (!selectedConversationId) return;
    markDirectConversationRead(selectedConversationId)
      .then(() => {
        qc.invalidateQueries({ queryKey: ["messages", "conversations"] });
      })
      .catch(() => undefined);
  }, [qc, selectedConversationId, selectedConversationQuery.data]);

  const startMutation = useMutation({
    mutationFn: () =>
      startDirectConversation({
        recipientUserId: selectedRecipientId as string,
        initialMessage: initialMessage.trim() || undefined,
        patientId: initialPatientId || undefined,
        documentId: initialDocumentId || undefined,
        priority: initialPriority,
      }),
    onSuccess: (conversation) => {
      const id = String(conversation.id || "");
      if (id) setSelectedConversationId(id);
      setSelectedRecipientId(null);
      setInitialMessage("");
      setInitialPatientId("");
      setInitialDocumentId("");
      setInitialPriority("NORMAL");
      qc.invalidateQueries({ queryKey: ["messages", "conversations"] });
    },
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      sendDirectMessage(selectedConversationId as string, {
        body: replyBody.trim(),
        patientId: replyPatientId || undefined,
        documentId: replyDocumentId || undefined,
        priority: replyPriority,
      }),
    onSuccess: () => {
      setReplyBody("");
      setReplyPatientId("");
      setReplyDocumentId("");
      setReplyPriority("NORMAL");
      qc.invalidateQueries({ queryKey: ["messages", "conversations"] });
      qc.invalidateQueries({ queryKey: ["messages", "conversations", selectedConversationId] });
    },
  });

  function onStart(e: FormEvent) {
    e.preventDefault();
    if (!selectedRecipientId) return;
    startMutation.mutate();
  }

  function onReply(e: FormEvent) {
    e.preventDefault();
    if (!selectedConversationId || !replyBody.trim()) return;
    sendMutation.mutate();
  }

  function renderContextFields(config: {
    patientId: string;
    documentId: string;
    priority: MessagePriority;
    documents: Record<string, unknown>[];
    loadingDocuments: boolean;
    onPatientChange: (value: string) => void;
    onDocumentChange: (value: string) => void;
    onPriorityChange: (value: MessagePriority) => void;
  }) {
    return (
      <div className="grid gap-3 rounded-2xl border border-white/8 bg-white/[0.025] p-3 md:grid-cols-[1fr_1fr_0.7fr]">
        <label className="space-y-1.5">
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Link patient
          </span>
          <select
            value={config.patientId}
            onChange={(event) => {
              config.onPatientChange(event.target.value);
              config.onDocumentChange("");
            }}
            className={inputClass}
          >
            <option value="">No patient link</option>
            {patients.map((patient) => {
              const id = String(patient.id || "");
              return (
                <option key={id} value={id}>
                  {patientLabel(patient)}
                </option>
              );
            })}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Link document
          </span>
          <select
            value={config.documentId}
            onChange={(event) => config.onDocumentChange(event.target.value)}
            disabled={!config.patientId || config.loadingDocuments}
            className={inputClass}
          >
            <option value="">
              {config.patientId
                ? config.loadingDocuments
                  ? "Loading documents..."
                  : "No document link"
                : "Select patient first"}
            </option>
            {config.documents.map((document) => {
              const id = String(document.id || "");
              return (
                <option key={id} value={id}>
                  {documentLabel(document)}
                </option>
              );
            })}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Priority
          </span>
          <select
            value={config.priority}
            onChange={(event) => config.onPriorityChange(event.target.value as MessagePriority)}
            className={inputClass}
          >
            <option value="NORMAL">Normal</option>
            <option value="IMPORTANT">Important</option>
            <option value="URGENT">Urgent</option>
          </select>
        </label>
      </div>
    );
  }

  return (
    <PortalShell title="Direct Messages">
      <div className="mb-4 rounded-[28px] border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm leading-6 text-amber-100">
        <div className="flex gap-3">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
          <p>
            Direct messages are for non-emergency coordination. For emergencies,
            call local emergency services or your hospital emergency line.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.78fr_1.22fr]">
        <div className="space-y-4">
          <Panel
            title="Search People"
            eyebrow="Start Conversation"
            description="Find active users in your organization and start a direct one-to-one thread."
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${inputClass} pl-11`}
                placeholder="Search by name or email"
              />
            </div>
            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
              {users.map((target) => (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => setSelectedRecipientId(target.id)}
                  className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                    selectedRecipientId === target.id
                      ? "border-primary/30 bg-primary/[0.08]"
                      : "border-white/8 bg-white/[0.03] hover:border-white/15"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-primary/10 text-xs font-semibold text-primary">
                      {initials(target.displayName || target.email)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{target.displayName || target.email}</p>
                      <p className="truncate text-xs text-muted-foreground">{target.email} · {formatRole(target.role)}</p>
                    </div>
                  </div>
                </button>
              ))}
              {users.length === 0 ? (
                <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                  {usersQuery.isLoading ? "Loading users..." : "No messageable users found."}
                </p>
              ) : null}
            </div>

            {selectedRecipient ? (
              <form onSubmit={onStart} className="mt-4 space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-primary/70">
                  Message {selectedRecipient.displayName || selectedRecipient.email}
                </p>
                <textarea
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                  className={textareaClass}
                  placeholder="Optional first message..."
                />
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
                  <input
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className={`${inputClass} pl-11`}
                    placeholder="Filter patient context by name or MRN"
                  />
                </div>
                {renderContextFields({
                  patientId: initialPatientId,
                  documentId: initialDocumentId,
                  priority: initialPriority,
                  documents: initialDocuments,
                  loadingDocuments: initialDocumentsQuery.isLoading,
                  onPatientChange: setInitialPatientId,
                  onDocumentChange: setInitialDocumentId,
                  onPriorityChange: setInitialPriority,
                })}
                <button
                  type="submit"
                  disabled={startMutation.isPending}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
                >
                  <UserRoundPlus className="h-4 w-4" strokeWidth={1.8} />
                  {startMutation.isPending ? "Starting..." : "Start Conversation"}
                </button>
              </form>
            ) : null}
          </Panel>

          <Panel title="Conversations" eyebrow="Inbox" description="Recent direct message threads.">
            <div className="space-y-2">
              {conversations.map((conversation) => {
                const id = String(conversation.id || "");
                const other = otherParticipant(conversation, user?.id || "");
                const latest = asRecord(asArray(conversation.messages)[0]);
                const isUnread = hasUnreadMessage(conversation, user?.id || "");
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedConversationId(id)}
                    className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                      selectedConversationId === id
                        ? "border-primary/30 bg-primary/[0.08]"
                        : isUnread
                          ? "border-red-400/30 bg-red-400/[0.07] hover:border-red-300/40"
                          : "border-white/8 bg-white/[0.03] hover:border-white/15"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-primary/10 text-xs font-semibold text-primary">
                        {initials(userLabel(other))}
                        {isUnread ? (
                          <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-red-500 shadow-[0_0_16px_rgba(239,68,68,0.75)]" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate text-sm font-medium ${isUnread ? "text-red-50" : "text-foreground"}`}>{userLabel(other)}</p>
                        {isUnread ? (
                          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-100">
                            New
                          </span>
                        ) : null}
                      </div>
                      <p className={`truncate text-xs ${isUnread ? "font-medium text-red-100/85" : "text-muted-foreground"}`}>
                          {latest.priority && latest.priority !== "NORMAL" ? `${formatRole(String(latest.priority))} · ` : ""}
                          {latest.body ? String(latest.body) : "No messages yet"}
                      </p>
                    </div>
                  </div>
                  </button>
                );
              })}
              {conversations.length === 0 ? (
                <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                  {conversationsQuery.isLoading ? "Loading conversations..." : "No conversations yet."}
                </p>
              ) : null}
            </div>
          </Panel>
        </div>

        <Panel
          title={selectedConversationId ? userLabel(otherParticipant(selectedConversation, user?.id || "")) : "Select a Conversation"}
          eyebrow="Thread"
          description={selectedConversationId ? "Messages stay inside your organization and are visible only to thread participants." : "Start or select a conversation to message directly."}
        >
          {selectedConversationId ? (
            <div className="space-y-4">
              <div className="max-h-[34rem] space-y-3 overflow-y-auto pr-1">
                {messages.map((message) => {
                  const typed = asRecord(message);
                  const sender = asRecord(typed.sender);
                  const isMine = String(sender.id || "") === user?.id;
                  return (
                    <div
                      key={String(typed.id || typed.createdAt)}
                      className={`max-w-[88%] rounded-2xl border p-3 ${
                        isMine
                          ? "ml-auto border-primary/20 bg-primary/[0.08]"
                          : "border-white/8 bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-medium text-foreground/90">{userLabel(sender)}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {typed.createdAt ? new Date(String(typed.createdAt)).toLocaleString() : ""}
                        </p>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground/90">{String(typed.body || "")}</p>
                      {(typed.patient || typed.document || (typed.priority && typed.priority !== "NORMAL")) ? (
                        <div className="mt-3 space-y-2 rounded-2xl border border-white/8 bg-background/40 p-3">
                          {typed.priority && typed.priority !== "NORMAL" ? (
                            <span className="inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-100">
                              {formatRole(String(typed.priority))}
                            </span>
                          ) : null}
                          {typed.patient ? (
                            <Link
                              to={patientWorkspacePath(user?.role, String(asRecord(typed.patient).id || ""))}
                              className="flex items-start gap-2 rounded-xl border border-primary/15 bg-primary/[0.06] p-2 text-xs text-primary transition-colors hover:bg-primary/[0.1]"
                            >
                              <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                              <span>
                                Linked patient: {patientLabel(asRecord(typed.patient))}
                              </span>
                            </Link>
                          ) : null}
                          {typed.document ? (
                            <div className="flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.03] p-2 text-xs text-muted-foreground">
                              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.8} />
                              <span>
                                Linked document: {documentLabel(asRecord(typed.document))}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {messages.length === 0 ? (
                  <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                    No messages yet.
                  </p>
                ) : null}
              </div>

              <form onSubmit={onReply} className="space-y-3">
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  className={textareaClass}
                  placeholder="Write a direct message..."
                />
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
                  <input
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className={`${inputClass} pl-11`}
                    placeholder="Filter patient context by name or MRN"
                  />
                </div>
                {renderContextFields({
                  patientId: replyPatientId,
                  documentId: replyDocumentId,
                  priority: replyPriority,
                  documents: replyDocuments,
                  loadingDocuments: replyDocumentsQuery.isLoading,
                  onPatientChange: setReplyPatientId,
                  onDocumentChange: setReplyDocumentId,
                  onPriorityChange: setReplyPriority,
                })}
                <button
                  type="submit"
                  disabled={!replyBody.trim() || sendMutation.isPending}
                  className="btn-shimmer inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-70"
                >
                  <Send className="h-4 w-4" strokeWidth={1.8} />
                  {sendMutation.isPending ? "Sending..." : "Send Message"}
                </button>
              </form>
            </div>
          ) : (
            <div className="flex min-h-[34rem] flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/[0.02] text-center">
              <MessageCircle className="h-11 w-11 text-primary" strokeWidth={1.5} />
              <p className="mt-3 text-sm text-muted-foreground">No direct conversation selected.</p>
            </div>
          )}
        </Panel>
      </div>
    </PortalShell>
  );
}
