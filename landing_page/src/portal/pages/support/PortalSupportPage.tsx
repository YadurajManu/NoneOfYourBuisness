import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, LifeBuoy, MessageSquarePlus, Send, SlidersHorizontal } from "lucide-react";
import {
  createSupportTicket,
  getSupportTicket,
  listPatients,
  listSupportAssignees,
  listSupportTickets,
  replyToSupportTicket,
  type SupportTicketCategory,
  type SupportTicketPriority,
  type SupportTicketStatus,
  updateSupportTicket,
} from "@/lib/api/client";
import { useAuth } from "@/portal/auth-context";
import { Panel } from "@/portal/panel";
import { PortalShell } from "@/portal/portal-shell";

const inputClass =
  "h-12 w-full rounded-2xl border border-white/10 bg-background/70 px-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15";
const selectClass =
  "h-12 w-full rounded-2xl border border-white/10 bg-background/70 px-4 text-sm text-foreground outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/15";
const textareaClass =
  "min-h-28 w-full rounded-2xl border border-white/10 bg-background/70 px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15";

const categories: Array<{ value: SupportTicketCategory; label: string }> = [
  { value: "ACCOUNT_LOGIN", label: "Account / Login" },
  { value: "PATIENT_INTAKE", label: "Patient Intake" },
  { value: "DOCUMENT_UPLOAD", label: "Document Upload" },
  { value: "CARE_TEAM_ASSIGNMENT", label: "Care-Team Assignment" },
  { value: "FAMILY_ACCESS_CONSENT", label: "Family Access / Consent" },
  { value: "CLINICAL_WORKFLOW", label: "Clinical Workflow" },
  { value: "BILLING_ADMIN", label: "Billing / Admin" },
  { value: "TECHNICAL_ISSUE", label: "Technical Issue" },
  { value: "OTHER", label: "Other" },
];

const priorities: SupportTicketPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];
const statuses: SupportTicketStatus[] = ["OPEN", "IN_REVIEW", "WAITING_ON_USER", "RESOLVED", "CLOSED"];

function asArray<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function formatEnum(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function getPatientName(resource: unknown, fallbackId: string) {
  if (!resource || typeof resource !== "object") return `Patient ${fallbackId.slice(0, 8)}`;
  const typed = resource as {
    name?: Array<{ text?: string; given?: string[]; family?: string }>;
  };
  const primary = typed.name?.[0];
  if (!primary) return `Patient ${fallbackId.slice(0, 8)}`;
  return primary.text || [primary.given?.join(" "), primary.family].filter(Boolean).join(" ").trim() || `Patient ${fallbackId.slice(0, 8)}`;
}

function statusClass(status: string) {
  if (status === "RESOLVED" || status === "CLOSED") return "border-emerald-400/20 bg-emerald-400/[0.1] text-emerald-200";
  if (status === "WAITING_ON_USER") return "border-amber-400/20 bg-amber-400/[0.1] text-amber-200";
  if (status === "IN_REVIEW") return "border-sky-400/20 bg-sky-400/[0.1] text-sky-200";
  return "border-primary/20 bg-primary/[0.1] text-primary";
}

function priorityClass(priority: string) {
  if (priority === "URGENT") return "border-rose-400/20 bg-rose-400/[0.1] text-rose-200";
  if (priority === "HIGH") return "border-amber-400/20 bg-amber-400/[0.1] text-amber-200";
  return "border-white/10 bg-white/[0.04] text-muted-foreground";
}

export default function PortalSupportPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const canTriage = user?.role === "ADMIN" || user?.role === "CARE_COORDINATOR";

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [category, setCategory] = useState<SupportTicketCategory>("TECHNICAL_ISSUE");
  const [priority, setPriority] = useState<SupportTicketPriority>("NORMAL");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [patientId, setPatientId] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [nextStatus, setNextStatus] = useState<SupportTicketStatus>("IN_REVIEW");
  const [nextPriority, setNextPriority] = useState<SupportTicketPriority>("NORMAL");
  const [nextAssigneeId, setNextAssigneeId] = useState("");

  const ticketsQuery = useQuery({ queryKey: ["support", "tickets"], queryFn: listSupportTickets });
  const selectedTicketQuery = useQuery({
    queryKey: ["support", "tickets", selectedTicketId],
    queryFn: () => getSupportTicket(selectedTicketId as string),
    enabled: Boolean(selectedTicketId),
  });
  const assigneesQuery = useQuery({
    queryKey: ["support", "assignees"],
    queryFn: listSupportAssignees,
  });
  const patientsQuery = useQuery({
    queryKey: ["support", "patients"],
    queryFn: listPatients,
  });

  const tickets = useMemo(() => asArray(ticketsQuery.data), [ticketsQuery.data]);
  const assignees = useMemo(() => asArray(assigneesQuery.data), [assigneesQuery.data]);
  const patients = useMemo(
    () =>
      asArray(patientsQuery.data).map((row) => ({
        id: String(row.id || ""),
        name: getPatientName(row.fhirResource, String(row.id || "")),
      })),
    [patientsQuery.data],
  );
  const selectedTicket = asRecord(selectedTicketQuery.data);
  const messages = asArray(selectedTicket.messages);

  const createMutation = useMutation({
    mutationFn: () =>
      createSupportTicket({
        category,
        priority,
        subject: subject.trim(),
        body: body.trim(),
        patientId: patientId || undefined,
      }),
    onSuccess: (ticket) => {
      setSubject("");
      setBody("");
      setPatientId("");
      setPriority("NORMAL");
      setCategory("TECHNICAL_ISSUE");
      const id = String(ticket.id || "");
      if (id) setSelectedTicketId(id);
      qc.invalidateQueries({ queryKey: ["support", "tickets"] });
    },
  });

  const replyMutation = useMutation({
    mutationFn: () => replyToSupportTicket(selectedTicketId as string, replyBody.trim()),
    onSuccess: () => {
      setReplyBody("");
      qc.invalidateQueries({ queryKey: ["support", "tickets"] });
      qc.invalidateQueries({ queryKey: ["support", "tickets", selectedTicketId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateSupportTicket(selectedTicketId as string, {
        status: nextStatus,
        priority: nextPriority,
        assignedToUserId: nextAssigneeId || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support", "tickets"] });
      qc.invalidateQueries({ queryKey: ["support", "tickets", selectedTicketId] });
    },
  });

  function onCreate(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate();
  }

  function onReply(e: FormEvent) {
    e.preventDefault();
    if (!selectedTicketId || !replyBody.trim()) return;
    replyMutation.mutate();
  }

  function syncTriageFields(ticket: Record<string, unknown>) {
    setNextStatus(String(ticket.status || "IN_REVIEW") as SupportTicketStatus);
    setNextPriority(String(ticket.priority || "NORMAL") as SupportTicketPriority);
    const assigned = asRecord(ticket.assignedToUser);
    setNextAssigneeId(String(assigned.id || ""));
  }

  return (
    <PortalShell title="Support Desk">
      <div className="mb-4 rounded-[28px] border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm leading-6 text-amber-100">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
          <p>
            This portal is not monitored for emergency response. For medical emergencies,
            call local emergency services or your hospital emergency line.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <Panel
            title="New Support Request"
            eyebrow="Structured Message"
            description="Create a ticket for access, intake, document, consent, assignment, or workflow issues."
          >
            <form onSubmit={onCreate} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Category</span>
                  <select value={category} onChange={(e) => setCategory(e.target.value as SupportTicketCategory)} className={selectClass}>
                    {categories.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Priority</span>
                  <select value={priority} onChange={(e) => setPriority(e.target.value as SupportTicketPriority)} className={selectClass}>
                    {priorities.map((item) => (
                      <option key={item} value={item}>{formatEnum(item)}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Patient context optional</span>
                <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className={selectClass}>
                  <option value="">No patient linked</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>{patient.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Subject</span>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass} placeholder="Short summary" />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Message</span>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} className={textareaClass} placeholder="Describe what happened, what patient/context it affects, and what action you need." />
              </label>
              <button type="submit" disabled={createMutation.isPending} className="btn-shimmer inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-6 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-70">
                <MessageSquarePlus className="h-4 w-4" strokeWidth={1.8} />
                {createMutation.isPending ? "Creating..." : "Create Request"}
              </button>
              {createMutation.isError ? (
                <p className="rounded-2xl border border-amber/20 bg-amber/[0.08] px-4 py-3 text-sm text-amber-100">
                  {createMutation.error instanceof Error ? createMutation.error.message : "Unable to create request"}
                </p>
              ) : null}
            </form>
          </Panel>

          <Panel title={canTriage ? "Organization Queue" : "My Requests"} eyebrow="Tickets" description={canTriage ? "All open and recent organization support work." : "Your own support requests and assigned threads."}>
            <div className="space-y-2">
              {tickets.map((ticket) => {
                const typed = asRecord(ticket);
                const id = String(typed.id || "");
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setSelectedTicketId(id);
                      syncTriageFields(typed);
                    }}
                    className={`w-full rounded-2xl border p-3 text-left transition-colors ${selectedTicketId === id ? "border-primary/30 bg-primary/[0.08]" : "border-white/8 bg-white/[0.03] hover:border-white/15"}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] ${statusClass(String(typed.status || "OPEN"))}`}>{formatEnum(String(typed.status || "OPEN"))}</span>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] ${priorityClass(String(typed.priority || "NORMAL"))}`}>{formatEnum(String(typed.priority || "NORMAL"))}</span>
                    </div>
                    <p className="mt-2 font-display text-base font-semibold text-foreground">{String(typed.subject || "Untitled request")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatEnum(String(typed.category || "OTHER"))}</p>
                  </button>
                );
              })}
              {tickets.length === 0 ? (
                <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                  {ticketsQuery.isLoading ? "Loading tickets..." : "No support tickets yet."}
                </p>
              ) : null}
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel
            title={selectedTicket.subject ? String(selectedTicket.subject) : "Select a Ticket"}
            eyebrow="Conversation"
            description={selectedTicketId ? "Reply in-thread so context stays attached to the ticket." : "Choose a ticket from the queue to view messages and status."}
          >
            {selectedTicketId ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs ${statusClass(String(selectedTicket.status || "OPEN"))}`}>{formatEnum(String(selectedTicket.status || "OPEN"))}</span>
                  <span className={`rounded-full border px-3 py-1 text-xs ${priorityClass(String(selectedTicket.priority || "NORMAL"))}`}>{formatEnum(String(selectedTicket.priority || "NORMAL"))}</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-muted-foreground">
                    {formatEnum(String(selectedTicket.category || "OTHER"))}
                  </span>
                </div>

                <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                  {messages.map((message) => {
                    const typed = asRecord(message);
                    const sender = asRecord(typed.sender);
                    const isMine = String(sender.id || "") === user?.id;
                    return (
                      <div key={String(typed.id || typed.createdAt)} className={`rounded-2xl border p-3 ${isMine ? "border-primary/20 bg-primary/[0.08]" : "border-white/8 bg-white/[0.03]"}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-medium text-foreground/90">{String(sender.displayName || sender.email || "User")}</p>
                          <p className="text-[11px] text-muted-foreground">{String(typed.createdAt || "") ? new Date(String(typed.createdAt)).toLocaleString() : ""}</p>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground/90">{String(typed.body || "")}</p>
                      </div>
                    );
                  })}
                </div>

                <form onSubmit={onReply} className="space-y-3">
                  <textarea value={replyBody} onChange={(e) => setReplyBody(e.target.value)} className={textareaClass} placeholder="Write a reply..." />
                  <button type="submit" disabled={!replyBody.trim() || replyMutation.isPending} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-60">
                    <Send className="h-4 w-4" strokeWidth={1.8} />
                    {replyMutation.isPending ? "Sending..." : "Send Reply"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex min-h-[22rem] flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/[0.02] text-center">
                <LifeBuoy className="h-10 w-10 text-primary" strokeWidth={1.5} />
                <p className="mt-3 text-sm text-muted-foreground">No ticket selected.</p>
              </div>
            )}
          </Panel>

          {canTriage && selectedTicketId ? (
            <Panel title="Triage Controls" eyebrow="Admin + Coordinator" description="Assign ownership, adjust priority, and move the request through resolution.">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateMutation.mutate();
                }}
                className="grid grid-cols-1 gap-3 md:grid-cols-3"
              >
                <label>
                  <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Status</span>
                  <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value as SupportTicketStatus)} className={selectClass}>
                    {statuses.map((item) => (
                      <option key={item} value={item}>{formatEnum(item)}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Priority</span>
                  <select value={nextPriority} onChange={(e) => setNextPriority(e.target.value as SupportTicketPriority)} className={selectClass}>
                    {priorities.map((item) => (
                      <option key={item} value={item}>{formatEnum(item)}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Assignee</span>
                  <select value={nextAssigneeId} onChange={(e) => setNextAssigneeId(e.target.value)} className={selectClass}>
                    <option value="">Unassigned</option>
                    {assignees.map((assignee) => (
                      <option key={String(assignee.id)} value={String(assignee.id)}>
                        {String(assignee.displayName || assignee.email)} · {formatEnum(String(assignee.role || ""))}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" disabled={updateMutation.isPending} className="md:col-span-3 inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-60">
                  <SlidersHorizontal className="h-4 w-4" strokeWidth={1.8} />
                  {updateMutation.isPending ? "Updating..." : "Update Ticket"}
                </button>
              </form>
            </Panel>
          ) : null}
        </div>
      </div>
    </PortalShell>
  );
}
