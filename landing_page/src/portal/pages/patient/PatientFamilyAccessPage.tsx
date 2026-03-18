import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock3,
  HeartHandshake,
  Mail,
  ShieldCheck,
  ShieldMinus,
  UserRound,
  XCircle,
} from "lucide-react";
import {
  listPatientFamilyAccess,
  listPatientFamilyAccessAudit,
  listPatientFamilyInvites,
  respondPatientFamilyInvite,
  revokePatientFamilyAccess,
} from "@/lib/api/client";
import { Panel } from "@/portal/panel";
import { PortalShell } from "@/portal/portal-shell";

type AccessLevel = "VIEW_ONLY" | "FULL_UPDATES" | "EMERGENCY_CONTACT";

type AccessGrant = {
  id: string;
  accessLevel: AccessLevel;
  status: string;
  consentNote: string | null;
  expiresAt: string | null;
  grantedAt: string;
  revokedAt: string | null;
  familyEmail: string;
};

type AccessInvite = {
  id: string;
  accessLevel: AccessLevel;
  status: string;
  consentNote: string | null;
  expiresAt: string | null;
  createdAt: string;
  respondedAt: string | null;
  responseNote: string | null;
  familyEmail: string;
  invitedByEmail: string;
};

type AuditRow = {
  id: string;
  action: string;
  note: string | null;
  createdAt: string;
  actorEmail: string;
};

function asArray<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

const accessLevelCopy: Record<AccessLevel, string> = {
  VIEW_ONLY: "Read-only visibility to updates and status.",
  FULL_UPDATES: "Detailed updates and communication visibility.",
  EMERGENCY_CONTACT: "Emergency communication channel enabled.",
};

export default function PatientFamilyAccessPage() {
  const qc = useQueryClient();
  const [inviteNotes, setInviteNotes] = useState<Record<string, string>>({});

  const accessQuery = useQuery({
    queryKey: ["patient", "family-access"],
    queryFn: listPatientFamilyAccess,
  });

  const invitesQuery = useQuery({
    queryKey: ["patient", "family-access", "invites"],
    queryFn: listPatientFamilyInvites,
  });

  const auditQuery = useQuery({
    queryKey: ["patient", "family-access", "audit"],
    queryFn: listPatientFamilyAccessAudit,
  });

  const grants = useMemo(() => {
    return asArray<Record<string, unknown>>(accessQuery.data).map((row) => {
      const familyUser = asRecord(row.familyUser);

      return {
        id: String(row.id || ""),
        accessLevel: String(row.accessLevel || "VIEW_ONLY") as AccessLevel,
        status: String(row.status || "ACTIVE"),
        consentNote: row.consentNote ? String(row.consentNote) : null,
        expiresAt: row.expiresAt ? String(row.expiresAt) : null,
        grantedAt: String(row.grantedAt || row.createdAt || ""),
        revokedAt: row.revokedAt ? String(row.revokedAt) : null,
        familyEmail: String(familyUser.email || "Unknown"),
      } as AccessGrant;
    });
  }, [accessQuery.data]);

  const invites = useMemo(() => {
    return asArray<Record<string, unknown>>(invitesQuery.data).map((row) => {
      const familyUser = asRecord(row.familyUser);
      const invitedByUser = asRecord(row.invitedByUser);

      return {
        id: String(row.id || ""),
        accessLevel: String(row.accessLevel || "VIEW_ONLY") as AccessLevel,
        status: String(row.status || "PENDING"),
        consentNote: row.consentNote ? String(row.consentNote) : null,
        expiresAt: row.expiresAt ? String(row.expiresAt) : null,
        createdAt: String(row.createdAt || ""),
        respondedAt: row.respondedAt ? String(row.respondedAt) : null,
        responseNote: row.responseNote ? String(row.responseNote) : null,
        familyEmail: String(familyUser.email || "Unknown"),
        invitedByEmail: String(invitedByUser.email || "Unknown"),
      } as AccessInvite;
    });
  }, [invitesQuery.data]);

  const auditRows = useMemo(() => {
    return asArray<Record<string, unknown>>(auditQuery.data).map((row) => {
      const actor = asRecord(row.actor);

      return {
        id: String(row.id || ""),
        action: String(row.action || "UNKNOWN"),
        note: row.note ? String(row.note) : null,
        createdAt: String(row.createdAt || ""),
        actorEmail: String(actor.email || "Unknown"),
      } as AuditRow;
    });
  }, [auditQuery.data]);

  const respondInvite = useMutation({
    mutationFn: (payload: { inviteId: string; decision: "APPROVE" | "REJECT"; note?: string }) =>
      respondPatientFamilyInvite(payload.inviteId, {
        decision: payload.decision,
        note: payload.note,
      }),
    onSuccess: (_result, variables) => {
      setInviteNotes((prev) => ({ ...prev, [variables.inviteId]: "" }));
      qc.invalidateQueries({ queryKey: ["patient", "family-access"] });
      qc.invalidateQueries({ queryKey: ["patient", "family-access", "invites"] });
      qc.invalidateQueries({ queryKey: ["patient", "family-access", "audit"] });
    },
  });

  const revoke = useMutation({
    mutationFn: (payload: { accessId: string; note?: string }) =>
      revokePatientFamilyAccess(payload.accessId, payload.note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient", "family-access"] });
      qc.invalidateQueries({ queryKey: ["patient", "family-access", "audit"] });
    },
  });

  const activeGrants = grants.filter((row) => row.status === "ACTIVE");
  const revokedGrants = grants.length - activeGrants.length;
  const pendingInvites = invites.filter((row) => row.status === "PENDING");
  const reviewedInvites = invites.filter((row) => row.status !== "PENDING");
  const expiringSoon = activeGrants.filter((row) => {
    if (!row.expiresAt) return false;
    const expires = new Date(row.expiresAt);
    const diff = expires.getTime() - Date.now();
    return diff > 0 && diff <= 1000 * 60 * 60 * 24 * 14;
  }).length;

  return (
    <PortalShell title="Family Access Controls">
      <Panel
        title="Consent Inbox"
        eyebrow="Patient Approval Workflow"
        description="Admin and doctor requests are queued here. Approve or reject each request with explicit consent notes."
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { label: "Pending Invites", value: pendingInvites.length, note: "Waiting for your decision", icon: Clock3 },
              { label: "Active Grants", value: activeGrants.length, note: "Currently valid", icon: ShieldCheck },
              { label: "Revoked", value: revokedGrants, note: "Retained for audit", icon: ShieldMinus },
              { label: "Expiring Soon", value: expiringSoon, note: "Within next 14 days", icon: HeartHandshake },
            ].map((metric) => (
              <div key={metric.label} className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{metric.label}</p>
                    <p className="mt-2 font-display text-4xl font-bold tracking-[-0.05em] text-foreground">{metric.value}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                    <metric.icon className="h-4 w-4" strokeWidth={1.8} />
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{metric.note}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-primary/70">Pending requests</p>
            <div className="mt-3 space-y-3">
              {pendingInvites.length === 0 && !invitesQuery.isLoading ? (
                <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-3 text-sm text-muted-foreground">
                  No pending family invitation requests.
                </p>
              ) : null}

              {pendingInvites.map((invite) => {
                const note = inviteNotes[invite.id] || "";
                return (
                  <article key={invite.id} className="rounded-2xl border border-white/8 bg-background/50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                        <Mail className="h-4 w-4 text-primary" strokeWidth={1.8} />
                        {invite.familyEmail}
                      </p>
                      <span className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        {invite.accessLevel}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                      Requested by {invite.invitedByEmail} • {formatDate(invite.createdAt)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Expiry: {invite.expiresAt ? formatDate(invite.expiresAt) : "No expiry"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {invite.consentNote ? `Consent note: ${invite.consentNote}` : accessLevelCopy[invite.accessLevel]}
                    </p>

                    <input
                      value={note}
                      onChange={(e) =>
                        setInviteNotes((prev) => ({
                          ...prev,
                          [invite.id]: e.target.value,
                        }))
                      }
                      placeholder="Optional response note"
                      className="mt-3 h-10 w-full rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
                    />

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          respondInvite.mutate({
                            inviteId: invite.id,
                            decision: "APPROVE",
                            note: note.trim() || undefined,
                          })
                        }
                        disabled={respondInvite.isPending}
                        className="inline-flex h-9 items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/[0.12] px-4 text-xs font-medium text-emerald-200 transition-colors hover:bg-emerald-400/[0.18] disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} />
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          respondInvite.mutate({
                            inviteId: invite.id,
                            decision: "REJECT",
                            note: note.trim() || undefined,
                          })
                        }
                        disabled={respondInvite.isPending}
                        className="inline-flex h-9 items-center gap-2 rounded-full border border-rose-400/25 bg-rose-400/[0.12] px-4 text-xs font-medium text-rose-200 transition-colors hover:bg-rose-400/[0.18] disabled:opacity-60"
                      >
                        <XCircle className="h-4 w-4" strokeWidth={1.8} />
                        Reject
                      </button>
                    </div>
                  </article>
                );
              })}

              {reviewedInvites.length > 0 ? (
                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Invite history</p>
                  <div className="mt-2 space-y-2">
                    {reviewedInvites.slice(0, 4).map((invite) => (
                      <div key={invite.id} className="rounded-xl border border-white/8 bg-background/50 px-3 py-2">
                        <p className="text-xs text-foreground/90">{invite.familyEmail}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {invite.status} • {formatDate(invite.respondedAt || invite.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </Panel>

      <Panel
        title="Current Grants"
        eyebrow="Access Level and Expiry"
        description="Review each family access entry with level, expiry, and revoke controls."
        className="mt-4"
      >
        <div className="space-y-3">
          {grants.length === 0 && !accessQuery.isLoading ? (
            <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
              No family access grants created yet.
            </p>
          ) : null}

          {grants.map((row) => (
            <article key={row.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                    <UserRound className="h-4 w-4 text-primary" strokeWidth={1.8} />
                    <span className="truncate">{row.familyEmail}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Granted {formatDate(row.grantedAt)}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {row.accessLevel}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${
                      row.status === "ACTIVE"
                        ? "border-emerald-400/20 bg-emerald-400/[0.1] text-emerald-200"
                        : "border-amber/25 bg-amber/[0.1] text-amber/90"
                    }`}
                  >
                    {row.status}
                  </span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/8 bg-background/50 px-3 py-2 text-xs text-muted-foreground">
                  {row.expiresAt ? `Expires ${formatDate(row.expiresAt)}` : "No expiry date"}
                </div>
                <div className="rounded-xl border border-white/8 bg-background/50 px-3 py-2 text-xs text-muted-foreground">
                  {row.consentNote ? `Consent note: ${row.consentNote}` : "No consent note recorded"}
                </div>
              </div>

              {row.status === "ACTIVE" ? (
                <button
                  onClick={() => revoke.mutate({ accessId: row.id })}
                  disabled={revoke.isPending}
                  className="mt-3 rounded-full border border-amber/30 bg-amber/[0.1] px-4 py-1.5 text-xs font-medium text-amber/90 transition-colors hover:bg-amber/[0.16] disabled:opacity-60"
                >
                  Revoke Access
                </button>
              ) : row.revokedAt ? (
                <p className="mt-3 text-xs text-muted-foreground">Revoked on {formatDate(row.revokedAt)}</p>
              ) : null}
            </article>
          ))}
        </div>
      </Panel>

      <Panel
        title="Audit Trail"
        eyebrow="Compliance Log"
        description="Immutable timeline of consent-related access actions in your patient workspace."
        className="mt-4"
      >
        <div className="space-y-3">
          {auditRows.length === 0 && !auditQuery.isLoading ? (
            <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
              No audit events yet.
            </p>
          ) : null}

          {auditRows.map((row) => (
            <article key={row.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {row.action}
                </span>
                <p className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</p>
              </div>
              <p className="mt-2 text-sm text-foreground/90">Actor: {row.actorEmail}</p>
              <p className="mt-1 text-xs text-muted-foreground">{row.note || "No note"}</p>
            </article>
          ))}
        </div>
      </Panel>

      {invitesQuery.isError ? <p className="mt-4 text-secondary">Unable to load pending invites.</p> : null}
      {accessQuery.isError ? <p className="mt-2 text-secondary">Unable to load family access grants.</p> : null}
      {auditQuery.isError ? <p className="mt-2 text-secondary">Unable to load family access audit.</p> : null}
      {respondInvite.isError ? <p className="mt-2 text-secondary">Unable to submit invite response.</p> : null}
      {revoke.isError ? <p className="mt-2 text-secondary">Unable to revoke access.</p> : null}
    </PortalShell>
  );
}
