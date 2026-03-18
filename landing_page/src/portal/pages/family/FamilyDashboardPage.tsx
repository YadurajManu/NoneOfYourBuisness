import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BellRing,
  Check,
  Clock3,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import {
  getFamilyNotificationPreferences,
  getFamilyPatientView,
  listFamilyNotifications,
  listFamilyPatients,
  markFamilyNotificationRead,
  updateFamilyNotificationPreferences,
} from "@/lib/api/client";
import { Panel } from "@/portal/panel";
import { PortalShell } from "@/portal/portal-shell";

type FamilyGrant = {
  id: string;
  accessLevel: string;
  expiresAt: string | null;
  lifecycleStage: number;
  patientId: string;
  patientName: string;
  updatedAt: string;
};

type FamilyNotification = {
  id: string;
  type: string;
  isRead: boolean;
  createdAt: string;
};

function asArray<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function getPatientName(resource: unknown, fallbackId: string) {
  if (!resource || typeof resource !== "object") return `Patient ${fallbackId.slice(0, 8)}`;

  const typed = resource as {
    name?: Array<{ text?: string; given?: string[]; family?: string }>;
  };

  const first = typed.name?.[0];
  if (!first) return `Patient ${fallbackId.slice(0, 8)}`;
  if (first.text && first.text.trim().length > 0) return first.text.trim();

  const fullName = [first.given?.join(" "), first.family].filter(Boolean).join(" ").trim();
  return fullName.length > 0 ? fullName : `Patient ${fallbackId.slice(0, 8)}`;
}

function stageBadge(stage: number) {
  if (stage >= 8) return "border-rose-400/20 bg-rose-400/[0.1] text-rose-200";
  if (stage >= 5) return "border-amber-400/20 bg-amber-400/[0.1] text-amber-200";
  return "border-emerald-400/20 bg-emerald-400/[0.1] text-emerald-200";
}

function relativeTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function FamilyDashboardPage() {
  const qc = useQueryClient();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const patientsQuery = useQuery({
    queryKey: ["family", "patients"],
    queryFn: listFamilyPatients,
  });

  const notificationsQuery = useQuery({
    queryKey: ["family", "notifications"],
    queryFn: listFamilyNotifications,
  });

  const preferencesQuery = useQuery({
    queryKey: ["family", "notification-preferences"],
    queryFn: getFamilyNotificationPreferences,
  });

  const grants = useMemo(() => {
    return asArray<Record<string, unknown>>(patientsQuery.data).map((row) => {
      const patient = (row.patient || {}) as Record<string, unknown>;
      const patientId = String(patient.id || "");

      return {
        id: String(row.id || ""),
        accessLevel: String(row.accessLevel || "VIEW_ONLY"),
        expiresAt: row.expiresAt ? String(row.expiresAt) : null,
        lifecycleStage: Number(patient.lifecycleStage || 0),
        patientId,
        patientName: getPatientName(patient.fhirResource, patientId),
        updatedAt: String(patient.updatedAt || ""),
      } as FamilyGrant;
    });
  }, [patientsQuery.data]);

  useEffect(() => {
    if (grants.length === 0) {
      setSelectedPatientId(null);
      return;
    }

    const exists = grants.some((grant) => grant.patientId === selectedPatientId);
    if (!selectedPatientId || !exists) {
      setSelectedPatientId(grants[0].patientId);
    }
  }, [grants, selectedPatientId]);

  const patientViewQuery = useQuery({
    queryKey: ["family", "patient-view", selectedPatientId],
    queryFn: () => getFamilyPatientView(selectedPatientId as string),
    enabled: Boolean(selectedPatientId),
  });

  const notifications = useMemo(() => {
    return asArray<Record<string, unknown>>(notificationsQuery.data).map((row) => ({
      id: String(row.id || ""),
      type: String(row.type || "UNKNOWN"),
      isRead: Boolean(row.isRead),
      createdAt: String(row.createdAt || ""),
    })) as FamilyNotification[];
  }, [notificationsQuery.data]);

  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const highPriorityCount = notifications.filter((item) => {
    const kind = item.type.toUpperCase();
    return kind.includes("ALERT") || kind.includes("OVERDUE") || kind.includes("ESCALATED");
  }).length;

  useEffect(() => {
    const source = (preferencesQuery.data || {}) as Record<string, unknown>;
    setInAppEnabled(Boolean(source.inAppEnabled ?? true));
    setEmailEnabled(Boolean(source.emailEnabled));
    setSmsEnabled(Boolean(source.smsEnabled));
    setEmailAddress(String(source.emailAddress || ""));
    setPhoneNumber(String(source.phoneNumber || ""));
  }, [preferencesQuery.data]);

  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) => markFamilyNotificationRead(notificationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family", "notifications"] }),
  });

  const savePreferencesMutation = useMutation({
    mutationFn: () =>
      updateFamilyNotificationPreferences({
        inAppEnabled,
        emailEnabled,
        smsEnabled,
        emailAddress: emailAddress || undefined,
        phoneNumber: phoneNumber || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family", "notification-preferences"] });
    },
  });

  const selectedGrant = grants.find((grant) => grant.patientId === selectedPatientId) || null;
  const patientView = (patientViewQuery.data || {}) as Record<string, unknown>;
  const selectedPatient = (patientView.patient || {}) as Record<string, unknown>;
  const selectedPatientDocuments = asArray<Record<string, unknown>>(selectedPatient.documents).slice(0, 6);

  return (
    <PortalShell title="Family Dashboard">
      <Panel
        title="Family Visibility Hub"
        eyebrow="Consent-Aware Access"
        description="Track shared patient updates, stay aligned with care teams, and control your notification channels from one place."
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Linked Patients", value: grants.length, note: "Active access grants", icon: Users },
              { label: "Unread Alerts", value: unreadCount, note: "Needs review", icon: BellRing },
              { label: "High Priority", value: highPriorityCount, note: "Escalation-type updates", icon: ShieldCheck },
              {
                label: "Expiring Soon",
                value: grants.filter((grant) => {
                  if (!grant.expiresAt) return false;
                  const expires = new Date(grant.expiresAt);
                  const now = new Date();
                  const diff = expires.getTime() - now.getTime();
                  return diff > 0 && diff <= 1000 * 60 * 60 * 24 * 14;
                }).length,
                note: "Within 14 days",
                icon: Clock3,
              },
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
                <p className="mt-3 text-xs text-muted-foreground">{metric.note}</p>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              savePreferencesMutation.mutate();
            }}
            className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-primary/70">Notification channels</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: "In-app", checked: inAppEnabled, setChecked: setInAppEnabled, icon: Bell },
                { label: "Email", checked: emailEnabled, setChecked: setEmailEnabled, icon: Mail },
                { label: "SMS", checked: smsEnabled, setChecked: setSmsEnabled, icon: Phone },
              ].map((channel) => (
                <label key={channel.label} className="flex items-center justify-between rounded-xl border border-white/10 bg-background/50 px-3 py-2 text-sm text-foreground">
                  <span className="flex items-center gap-2">
                    <channel.icon className="h-4 w-4 text-primary" strokeWidth={1.8} />
                    {channel.label}
                  </span>
                  <input
                    type="checkbox"
                    checked={channel.checked}
                    onChange={(e) => channel.setChecked(e.target.checked)}
                    className="h-4 w-4 rounded border-white/30 bg-background"
                  />
                </label>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="Notification email"
                className="h-10 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
              />
              <input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="SMS number"
                className="h-10 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
              />
            </div>

            <button
              type="submit"
              disabled={savePreferencesMutation.isPending}
              className="mt-3 h-10 rounded-xl border border-primary/30 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
            >
              {savePreferencesMutation.isPending ? "Saving..." : "Save Preferences"}
            </button>
          </form>
        </div>
      </Panel>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel
          title="My Patients"
          eyebrow="Family Access"
          description="Open a patient to view stage, latest updates, and document activity under your current consent level."
          className="h-full"
        >
          <div className="space-y-3">
            {grants.length === 0 && !patientsQuery.isLoading ? (
              <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                No active patient access grants yet.
              </p>
            ) : null}

            {grants.map((grant) => (
              <button
                key={grant.id}
                onClick={() => setSelectedPatientId(grant.patientId)}
                className={`w-full rounded-2xl border p-4 text-left transition-all ${
                  grant.patientId === selectedPatientId
                    ? "border-primary/30 bg-primary/[0.08]"
                    : "border-white/8 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-semibold tracking-[-0.03em] text-foreground">
                      {grant.patientName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Patient ID: {grant.patientId}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Last updated {relativeTime(grant.updatedAt)}
                    </p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium ${stageBadge(grant.lifecycleStage)}`}>
                    Stage {grant.lifecycleStage}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/12 bg-white/[0.03] px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {grant.accessLevel}
                  </span>
                  {grant.expiresAt ? (
                    <span className="rounded-full border border-amber/25 bg-amber/[0.08] px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-amber/90">
                      Expires {new Date(grant.expiresAt).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="rounded-full border border-primary/20 bg-primary/[0.08] px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-primary/80">
                      No expiry
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel
            title={selectedGrant ? `${selectedGrant.patientName} Context` : "Selected Patient"}
            eyebrow="Shared Record"
            description={
              selectedGrant
                ? `Access level: ${selectedGrant.accessLevel}`
                : "Select a patient to view timeline-connected context and documents."
            }
          >
            {!selectedPatientId ? (
              <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                Select a patient to view details.
              </p>
            ) : patientViewQuery.isLoading ? (
              <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                Loading patient details...
              </p>
            ) : patientViewQuery.isError ? (
              <p className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.08] p-4 text-sm text-rose-200">
                Unable to load this patient view.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Patient record</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-foreground/90">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                      <UserRound className="h-4 w-4 text-primary" strokeWidth={1.8} />
                      {getPatientName(selectedPatient.fhirResource, String(selectedPatient.id || ""))}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                      Stage {String(selectedPatient.lifecycleStage || "-")}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Recent documents</p>
                  <div className="mt-3 space-y-2">
                    {selectedPatientDocuments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No documents shared yet.</p>
                    ) : (
                      selectedPatientDocuments.map((document) => (
                        <div key={String(document.id)} className="rounded-xl border border-white/10 bg-background/50 px-3 py-2">
                          <p className="text-sm text-foreground/90">{String(document.type || "Document")}</p>
                          <p className="text-xs text-muted-foreground">
                            {String(document.status || "UNKNOWN")} • {relativeTime(String(document.createdAt || ""))}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </Panel>

          <Panel
            title="Family Notifications"
            eyebrow="Recent Events"
            description="Mark read events as you process updates from care teams and system workflow changes."
          >
            <div className="space-y-2">
              {notifications.length === 0 && !notificationsQuery.isLoading ? (
                <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                  No notifications yet.
                </p>
              ) : null}

              {notifications.slice(0, 12).map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-3 ${
                    item.isRead
                      ? "border-white/8 bg-white/[0.02]"
                      : "border-primary/20 bg-primary/[0.07]"
                  }`}
                >
                  <div>
                    <p className="text-sm text-foreground/90">{item.type.replaceAll("_", " ")}</p>
                    <p className="text-xs text-muted-foreground">{relativeTime(item.createdAt)}</p>
                  </div>
                  {item.isRead ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/[0.1] px-3 py-1 text-xs text-emerald-200">
                      <Check className="h-3 w-3" strokeWidth={2} />
                      Read
                    </span>
                  ) : (
                    <button
                      onClick={() => markReadMutation.mutate(item.id)}
                      disabled={markReadMutation.isPending}
                      className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary/35 hover:bg-primary/[0.08] disabled:opacity-60"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {patientsQuery.isError ? <p className="mt-4 text-secondary">Unable to load family patients.</p> : null}
      {notificationsQuery.isError ? <p className="mt-2 text-secondary">Unable to load notifications.</p> : null}
      {savePreferencesMutation.isError ? <p className="mt-2 text-secondary">Unable to save preferences.</p> : null}
    </PortalShell>
  );
}
