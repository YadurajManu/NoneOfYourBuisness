import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ClipboardCheck,
  Clock3,
  FileText,
  HeartPulse,
  Mail,
  ShieldCheck,
  ShieldMinus,
  Stethoscope,
} from "lucide-react";
import {
  createFamilyAccessInvite,
  createClinicalEvent,
  createClinicalOrder,
  createReferralHandoff,
  getPatientTimeline,
  getPatientWorkflowSummary,
  listActiveSpecialists,
  listFamilyAccessAuditForPatient,
  listFamilyAccessGrantsForPatient,
  listFamilyAccessInvitesForPatient,
  revokeFamilyAccessGrant,
  updateClinicalOrderStatus,
  updatePatientLifecycleStage,
  updateReferralStatus,
} from "@/lib/api/client";
import { Panel } from "@/portal/panel";
import { PortalShell } from "@/portal/portal-shell";

export type ClinicalRoleMode = "DOCTOR" | "SPECIALIST";

function asArray<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function getPatientName(resource: unknown, fallbackId: string) {
  if (!resource || typeof resource !== "object") return `Patient ${fallbackId.slice(0, 8)}`;

  const typed = resource as {
    name?: Array<{ text?: string; given?: string[]; family?: string }>;
  };

  const primary = typed.name?.[0];
  if (!primary) return `Patient ${fallbackId.slice(0, 8)}`;
  if (primary.text && primary.text.trim().length > 0) return primary.text.trim();

  const fullName = [primary.given?.join(" "), primary.family].filter(Boolean).join(" ").trim();
  return fullName.length > 0 ? fullName : `Patient ${fallbackId.slice(0, 8)}`;
}

function getPrimaryTelecom(resource: unknown) {
  if (!resource || typeof resource !== "object") return "-";

  const typed = resource as {
    telecom?: Array<{ system?: string; value?: string }>;
  };

  const phone = typed.telecom?.find((row) => row.system === "phone")?.value;
  const email = typed.telecom?.find((row) => row.system === "email")?.value;
  return phone || email || "-";
}

function stageBadge(stage: number) {
  if (stage >= 8) return "border-rose-400/20 bg-rose-400/[0.1] text-rose-200";
  if (stage >= 5) return "border-amber-400/20 bg-amber-400/[0.1] text-amber-200";
  return "border-emerald-400/20 bg-emerald-400/[0.1] text-emerald-200";
}

function safeDate(value: unknown) {
  const asString = String(value || "");
  if (!asString) return "-";
  const parsed = new Date(asString);
  return Number.isNaN(parsed.getTime()) ? asString : parsed.toLocaleString();
}

const orderStatuses = ["ACTIVE", "IN_PROGRESS", "ESCALATED", "COMPLETED", "CANCELLED"] as const;
const referralStatuses = [
  "CREATED",
  "ACCEPTED",
  "IN_PROGRESS",
  "ESCALATED",
  "COMPLETED",
  "DECLINED",
  "CANCELLED",
] as const;

type Summary = {
  pendingOrders: number;
  escalatedOrders: number;
  openTasks: number;
  overdueTasks: number;
  pendingPriorAuthorizations: number;
  activeReferrals: number;
  overdueReferrals: number;
};

type FamilyAccessLevel = "VIEW_ONLY" | "FULL_UPDATES" | "EMERGENCY_CONTACT";

type FamilyInviteRow = {
  id: string;
  familyEmail: string;
  accessLevel: FamilyAccessLevel;
  status: string;
  consentNote: string | null;
  expiresAt: string | null;
  createdAt: string;
};

type FamilyGrantRow = {
  id: string;
  familyEmail: string;
  accessLevel: FamilyAccessLevel;
  status: string;
  consentNote: string | null;
  grantedAt: string;
  expiresAt: string | null;
};

type FamilyAuditRow = {
  id: string;
  action: string;
  actorEmail: string;
  note: string | null;
  createdAt: string;
};

export function PatientDetailWorkspace({ mode }: { mode: ClinicalRoleMode }) {
  const { patientId = "" } = useParams();
  const qc = useQueryClient();
  const isDoctor = mode === "DOCTOR";

  const timelineQuery = useQuery({
    queryKey: [mode.toLowerCase(), "patient-detail", patientId],
    queryFn: () => getPatientTimeline(patientId),
    enabled: Boolean(patientId),
  });

  const summaryQuery = useQuery({
    queryKey: [mode.toLowerCase(), "patient-summary", patientId],
    queryFn: () => getPatientWorkflowSummary(patientId),
    enabled: Boolean(patientId),
  });

  const specialistsQuery = useQuery({
    queryKey: [mode.toLowerCase(), "specialists"],
    queryFn: listActiveSpecialists,
    enabled: isDoctor,
  });

  const familyInvitesQuery = useQuery({
    queryKey: [mode.toLowerCase(), "patient-family-invites", patientId],
    queryFn: () => listFamilyAccessInvitesForPatient(patientId),
    enabled: isDoctor && Boolean(patientId),
  });

  const familyGrantsQuery = useQuery({
    queryKey: [mode.toLowerCase(), "patient-family-grants", patientId],
    queryFn: () => listFamilyAccessGrantsForPatient(patientId),
    enabled: isDoctor && Boolean(patientId),
  });

  const familyAuditQuery = useQuery({
    queryKey: [mode.toLowerCase(), "patient-family-audit", patientId],
    queryFn: () => listFamilyAccessAuditForPatient(patientId),
    enabled: isDoctor && Boolean(patientId),
  });

  const timeline = (timelineQuery.data || {}) as Record<string, unknown>;
  const patient = (timeline.patient || {}) as Record<string, unknown>;
  const patientResource = patient.fhirResource;
  const patientName = getPatientName(patientResource, String(patient.id || ""));

  const documents = asArray<Record<string, unknown>>(timeline.documents).slice(0, 12);
  const events = asArray<Record<string, unknown>>(timeline.events).slice(0, 20);
  const clinicalEvents = asArray<Record<string, unknown>>(timeline.clinicalEvents).slice(0, 12);
  const orders = asArray<Record<string, unknown>>(timeline.clinicalOrders).slice(0, 12);
  const tasks = asArray<Record<string, unknown>>(timeline.careTasks).slice(0, 12);
  const medications = asArray<Record<string, unknown>>(timeline.medicationPlans).slice(0, 12);
  const priorAuths = asArray<Record<string, unknown>>(timeline.priorAuthorizations).slice(0, 12);
  const referrals = asArray<Record<string, unknown>>(timeline.referralHandoffs).slice(0, 12);
  const specialists = (specialistsQuery.data || []) as Array<Record<string, unknown>>;

  const summary = (summaryQuery.data || {}) as Partial<Summary>;

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedOrderStatus, setSelectedOrderStatus] = useState<(typeof orderStatuses)[number]>("IN_PROGRESS");
  const [orderNote, setOrderNote] = useState("");

  const [selectedReferralId, setSelectedReferralId] = useState("");
  const [selectedReferralStatus, setSelectedReferralStatus] =
    useState<(typeof referralStatuses)[number]>("IN_PROGRESS");
  const [referralNote, setReferralNote] = useState("");

  const [eventSeverity, setEventSeverity] = useState<"INFO" | "WARNING" | "CRITICAL">("WARNING");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");

  const [nextStage, setNextStage] = useState(2);
  const [stageReason, setStageReason] = useState("");

  const [orderType, setOrderType] = useState<
    "LAB_TEST" | "IMAGING" | "PROCEDURE" | "MEDICATION" | "CONSULTATION" | "FOLLOW_UP"
  >("FOLLOW_UP");
  const [orderPriority, setOrderPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "STAT">("MEDIUM");
  const [orderTitle, setOrderTitle] = useState("");
  const [orderAssignedSpecialistId, setOrderAssignedSpecialistId] = useState("");

  const [referralPriority, setReferralPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [referralDestinationName, setReferralDestinationName] = useState("Specialist Pool");
  const [referralAssignedSpecialistId, setReferralAssignedSpecialistId] = useState("");

  const [familyInviteEmail, setFamilyInviteEmail] = useState("");
  const [familyInviteAccessLevel, setFamilyInviteAccessLevel] =
    useState<FamilyAccessLevel>("VIEW_ONLY");
  const [familyInviteConsentNote, setFamilyInviteConsentNote] = useState("");
  const [familyInviteExpiresAt, setFamilyInviteExpiresAt] = useState("");

  const familyInvites = useMemo(() => {
    return asArray<Record<string, unknown>>(familyInvitesQuery.data).map((row) => {
      const familyUser = asRecord(row.familyUser);

      return {
        id: String(row.id || ""),
        familyEmail: String(familyUser.email || "Unknown"),
        accessLevel: String(row.accessLevel || "VIEW_ONLY") as FamilyAccessLevel,
        status: String(row.status || "PENDING"),
        consentNote: row.consentNote ? String(row.consentNote) : null,
        expiresAt: row.expiresAt ? String(row.expiresAt) : null,
        createdAt: String(row.createdAt || ""),
      } as FamilyInviteRow;
    });
  }, [familyInvitesQuery.data]);

  const familyGrants = useMemo(() => {
    return asArray<Record<string, unknown>>(familyGrantsQuery.data).map((row) => {
      const familyUser = asRecord(row.familyUser);

      return {
        id: String(row.id || ""),
        familyEmail: String(familyUser.email || "Unknown"),
        accessLevel: String(row.accessLevel || "VIEW_ONLY") as FamilyAccessLevel,
        status: String(row.status || "ACTIVE"),
        consentNote: row.consentNote ? String(row.consentNote) : null,
        grantedAt: String(row.grantedAt || row.createdAt || ""),
        expiresAt: row.expiresAt ? String(row.expiresAt) : null,
      } as FamilyGrantRow;
    });
  }, [familyGrantsQuery.data]);

  const familyAudit = useMemo(() => {
    return asArray<Record<string, unknown>>(familyAuditQuery.data).map((row) => {
      const actor = asRecord(row.actor);

      return {
        id: String(row.id || ""),
        action: String(row.action || "UNKNOWN"),
        actorEmail: String(actor.email || "Unknown"),
        note: row.note ? String(row.note) : null,
        createdAt: String(row.createdAt || ""),
      } as FamilyAuditRow;
    });
  }, [familyAuditQuery.data]);

  useEffect(() => {
    if (orders.length === 0) {
      setSelectedOrderId("");
      return;
    }
    const firstId = String(orders[0].id || "");
    if (!selectedOrderId || !orders.some((row) => String(row.id) === selectedOrderId)) {
      setSelectedOrderId(firstId);
    }
  }, [orders, selectedOrderId]);

  useEffect(() => {
    if (referrals.length === 0) {
      setSelectedReferralId("");
      return;
    }
    const firstId = String(referrals[0].id || "");
    if (!selectedReferralId || !referrals.some((row) => String(row.id) === selectedReferralId)) {
      setSelectedReferralId(firstId);
    }
  }, [referrals, selectedReferralId]);

  useEffect(() => {
    const stage = Number(patient.lifecycleStage || 1);
    setNextStage(Math.min(10, Math.max(1, stage + 1)));
  }, [patient.lifecycleStage, patient.id]);

  function refreshDetail() {
    qc.invalidateQueries({ queryKey: [mode.toLowerCase(), "patient-detail", patientId] });
    qc.invalidateQueries({ queryKey: [mode.toLowerCase(), "patient-summary", patientId] });
    qc.invalidateQueries({ queryKey: ["doctor", "caseload"] });
    qc.invalidateQueries({ queryKey: ["specialist", "caseload"] });
    qc.invalidateQueries({ queryKey: ["specialist", "referral-pool"] });
  }

  const updateOrderMutation = useMutation({
    mutationFn: () =>
      updateClinicalOrderStatus(selectedOrderId, {
        status: selectedOrderStatus,
        note: orderNote || undefined,
      }),
    onSuccess: () => {
      setOrderNote("");
      refreshDetail();
    },
  });

  const updateReferralMutation = useMutation({
    mutationFn: () =>
      updateReferralStatus(selectedReferralId, {
        status: selectedReferralStatus,
        note: referralNote || undefined,
      }),
    onSuccess: () => {
      setReferralNote("");
      refreshDetail();
    },
  });

  const createEventMutation = useMutation({
    mutationFn: () =>
      createClinicalEvent(patientId, {
        type: "FOLLOW_UP",
        severity: eventSeverity,
        title: eventTitle,
        description: eventDescription || undefined,
        raiseAlert: eventSeverity === "CRITICAL",
      }),
    onSuccess: () => {
      setEventTitle("");
      setEventDescription("");
      refreshDetail();
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: () =>
      updatePatientLifecycleStage(patientId, {
        stage: nextStage,
        reason: stageReason || undefined,
      }),
    onSuccess: () => {
      setStageReason("");
      refreshDetail();
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: () =>
      createClinicalOrder(patientId, {
        type: orderType,
        priority: orderPriority,
        title: orderTitle,
        assignedToUserId: orderAssignedSpecialistId || undefined,
      }),
    onSuccess: () => {
      setOrderTitle("");
      setOrderAssignedSpecialistId("");
      refreshDetail();
    },
  });

  const createReferralMutation = useMutation({
    mutationFn: () =>
      createReferralHandoff(patientId, {
        destinationType: "INTERNAL_PROVIDER",
        destinationName: referralDestinationName,
        priority: referralPriority,
        assignedToUserId: referralAssignedSpecialistId || undefined,
      }),
    onSuccess: () => {
      setReferralDestinationName("Specialist Pool");
      setReferralAssignedSpecialistId("");
      refreshDetail();
    },
  });

  const inviteFamilyMutation = useMutation({
    mutationFn: () =>
      createFamilyAccessInvite(patientId, {
        familyEmail: familyInviteEmail.trim(),
        accessLevel: familyInviteAccessLevel,
        consentNote: familyInviteConsentNote.trim() || undefined,
        expiresAt: familyInviteExpiresAt
          ? new Date(familyInviteExpiresAt).toISOString()
          : undefined,
      }),
    onSuccess: () => {
      setFamilyInviteEmail("");
      setFamilyInviteAccessLevel("VIEW_ONLY");
      setFamilyInviteConsentNote("");
      setFamilyInviteExpiresAt("");
      qc.invalidateQueries({
        queryKey: [mode.toLowerCase(), "patient-family-invites", patientId],
      });
      qc.invalidateQueries({
        queryKey: [mode.toLowerCase(), "patient-family-audit", patientId],
      });
    },
  });

  const revokeFamilyMutation = useMutation({
    mutationFn: (accessId: string) => revokeFamilyAccessGrant(accessId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [mode.toLowerCase(), "patient-family-grants", patientId],
      });
      qc.invalidateQueries({
        queryKey: [mode.toLowerCase(), "patient-family-audit", patientId],
      });
    },
  });

  function handleOrderStatusSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedOrderId) return;
    updateOrderMutation.mutate();
  }

  function handleReferralStatusSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedReferralId) return;
    updateReferralMutation.mutate();
  }

  function handleEventSubmit(e: FormEvent) {
    e.preventDefault();
    if (!eventTitle.trim()) return;
    createEventMutation.mutate();
  }

  function handleStageSubmit(e: FormEvent) {
    e.preventDefault();
    updateStageMutation.mutate();
  }

  function handleCreateOrder(e: FormEvent) {
    e.preventDefault();
    if (!orderTitle.trim()) return;
    createOrderMutation.mutate();
  }

  function handleCreateReferral(e: FormEvent) {
    e.preventDefault();
    if (!referralDestinationName.trim()) return;
    createReferralMutation.mutate();
  }

  function handleInviteFamily(e: FormEvent) {
    e.preventDefault();
    if (!familyInviteEmail.trim()) return;
    inviteFamilyMutation.mutate();
  }

  const pageTitle = mode === "DOCTOR" ? "Doctor Patient Detail" : "Specialist Patient Detail";
  const backPath = mode === "DOCTOR" ? "/portal/doctor/caseload" : "/portal/specialist/caseload";

  return (
    <PortalShell title={pageTitle}>
      <Panel
        title={patientName}
        eyebrow="Unified Patient Record"
        description="Detailed patient view with profile, timeline, documents, workflow objects, and role actions."
        action={
          <Link
            to={backPath}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-sm text-foreground transition-colors hover:border-primary/35 hover:bg-primary/[0.08]"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
            Back to Caseload
          </Link>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Lifecycle Stage", value: Number(patient.lifecycleStage || 0), icon: Activity },
            { label: "Documents", value: documents.length, icon: FileText },
            { label: "Clinical Events", value: clinicalEvents.length, icon: HeartPulse },
            { label: "Referrals", value: referrals.length, icon: Stethoscope },
          ].map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{metric.label}</p>
                <metric.icon className="h-4 w-4 text-primary" strokeWidth={1.8} />
              </div>
              <p className="mt-2 font-display text-3xl font-bold tracking-[-0.05em] text-foreground">{metric.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${stageBadge(Number(patient.lifecycleStage || 0))}`}>
            Stage {Number(patient.lifecycleStage || 0)}
          </span>
          <span className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
            Patient ID {String(patient.id || "").slice(0, 8)}
          </span>
          <span className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
            Contact {getPrimaryTelecom(patientResource)}
          </span>
        </div>
      </Panel>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <Panel
            title="Patient Profile and Timeline"
            eyebrow="Clinical Context"
            description="FHIR profile snapshot plus chronological timeline events."
          >
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Profile Snapshot</p>
                <div className="mt-3 space-y-2 text-sm">
                  <p className="text-foreground/90"><span className="text-muted-foreground">Name:</span> {patientName}</p>
                  <p className="text-foreground/90"><span className="text-muted-foreground">Gender:</span> {String((patientResource as Record<string, unknown>)?.gender || "-")}</p>
                  <p className="text-foreground/90"><span className="text-muted-foreground">Birth Date:</span> {String((patientResource as Record<string, unknown>)?.birthDate || "-")}</p>
                  <p className="text-foreground/90"><span className="text-muted-foreground">Last Update:</span> {safeDate(patient.updatedAt)}</p>
                </div>
              </div>

              <div className="space-y-2">
                {events.length === 0 ? (
                  <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                    No timeline events.
                  </p>
                ) : (
                  events.slice(0, 8).map((event, idx) => (
                    <div key={`${String(event.type)}-${idx}`} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-primary/70">{String(event.type || "EVENT")}</p>
                      <p className="mt-1 text-sm text-foreground/90">{String(event.detail || "-")}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{safeDate(event.at)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Panel>

          <Panel
            title="Clinical Data Blocks"
            eyebrow="All Information"
            description="Documents, events, orders, tasks, medications, prior auth, and referrals in one workspace."
          >
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Documents</p>
                {documents.slice(0, 6).map((row) => (
                  <div key={String(row.id)} className="rounded-xl border border-white/10 bg-background/50 px-3 py-2">
                    <p className="text-sm text-foreground/90">{String(row.type || "Document")}</p>
                    <p className="text-xs text-muted-foreground">{String(row.status || "-")} • {safeDate(row.createdAt)}</p>
                  </div>
                ))}
                {documents.length === 0 ? <p className="text-sm text-muted-foreground">No documents.</p> : null}
              </div>

              <div className="space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Clinical Events and Alerts</p>
                {clinicalEvents.slice(0, 6).map((row) => {
                  const alert = (row.alert || {}) as Record<string, unknown>;
                  return (
                    <div key={String(row.id)} className="rounded-xl border border-white/10 bg-background/50 px-3 py-2">
                      <p className="text-sm text-foreground/90">{String(row.title || row.type || "Clinical event")}</p>
                      <p className="text-xs text-muted-foreground">
                        {String(row.severity || "-")} • Alert {String(alert.status || "NONE")} • {safeDate(row.occurredAt)}
                      </p>
                    </div>
                  );
                })}
                {clinicalEvents.length === 0 ? <p className="text-sm text-muted-foreground">No clinical events.</p> : null}
              </div>

              <div className="space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Orders and Tasks</p>
                {orders.slice(0, 4).map((row) => (
                  <div key={String(row.id)} className="rounded-xl border border-white/10 bg-background/50 px-3 py-2">
                    <p className="text-sm text-foreground/90">{String(row.title || row.type || "Order")}</p>
                    <p className="text-xs text-muted-foreground">{String(row.status || "-")} • {String(row.priority || "-")}</p>
                  </div>
                ))}
                {tasks.slice(0, 4).map((row) => (
                  <div key={String(row.id)} className="rounded-xl border border-white/10 bg-background/50 px-3 py-2">
                    <p className="text-sm text-foreground/90">Task: {String(row.title || row.type || "Task")}</p>
                    <p className="text-xs text-muted-foreground">{String(row.status || "-")} • Due {safeDate(row.dueAt)}</p>
                  </div>
                ))}
                {orders.length === 0 && tasks.length === 0 ? <p className="text-sm text-muted-foreground">No orders/tasks.</p> : null}
              </div>

              <div className="space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Meds, Prior Auth, Referrals</p>
                {medications.slice(0, 3).map((row) => (
                  <div key={String(row.id)} className="rounded-xl border border-white/10 bg-background/50 px-3 py-2">
                    <p className="text-sm text-foreground/90">{String(row.medicationName || "Medication")}</p>
                    <p className="text-xs text-muted-foreground">{String(row.status || "-")} • {String(row.dosage || "-")}</p>
                  </div>
                ))}
                {priorAuths.slice(0, 3).map((row) => (
                  <div key={String(row.id)} className="rounded-xl border border-white/10 bg-background/50 px-3 py-2">
                    <p className="text-sm text-foreground/90">Prior Auth: {String(row.payerName || "-")}</p>
                    <p className="text-xs text-muted-foreground">{String(row.status || "-")} • {safeDate(row.createdAt)}</p>
                  </div>
                ))}
                {referrals.slice(0, 3).map((row) => (
                  <div key={String(row.id)} className="rounded-xl border border-white/10 bg-background/50 px-3 py-2">
                    <p className="text-sm text-foreground/90">Referral: {String(row.destinationName || row.destinationType || "-")}</p>
                    <p className="text-xs text-muted-foreground">{String(row.status || "-")} • {String(row.priority || "-")}</p>
                  </div>
                ))}
                {medications.length === 0 && priorAuths.length === 0 && referrals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No medication/prior-auth/referral records.</p>
                ) : null}
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel
            title="Workflow Summary"
            eyebrow="Live Metrics"
            description="Operational counts for active care execution."
          >
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Pending Orders", value: toNumber(summary.pendingOrders), icon: ClipboardCheck },
                { label: "Open Tasks", value: toNumber(summary.openTasks), icon: Activity },
                { label: "Overdue Tasks", value: toNumber(summary.overdueTasks), icon: AlertTriangle },
                { label: "Active Referrals", value: toNumber(summary.activeReferrals), icon: Stethoscope },
              ].map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{metric.label}</p>
                    <metric.icon className="h-4 w-4 text-primary" strokeWidth={1.8} />
                  </div>
                  <p className="mt-2 font-display text-3xl font-bold tracking-[-0.05em] text-foreground">{metric.value}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="Role Actions"
            eyebrow={mode === "DOCTOR" ? "Doctor Controls" : "Specialist Controls"}
            description="Perform chart-level actions without leaving this detailed patient page."
          >
            <div className="space-y-4">
              <form onSubmit={handleOrderStatusSubmit} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-primary/70">Update Order Status</p>
                <div className="mt-3 grid grid-cols-1 gap-3">
                  <select
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none focus:border-primary/40"
                    disabled={orders.length === 0}
                  >
                    {orders.length === 0 ? <option value="">No orders</option> : null}
                    {orders.map((row) => (
                      <option key={String(row.id)} value={String(row.id)}>
                        {String(row.type || "ORDER")} • {String(row.title || "Untitled")}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedOrderStatus}
                    onChange={(e) => setSelectedOrderStatus(e.target.value as (typeof orderStatuses)[number])}
                    className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none focus:border-primary/40"
                  >
                    {orderStatuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <input
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder="Order note"
                    className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
                  />
                  <button
                    type="submit"
                    disabled={!selectedOrderId || updateOrderMutation.isPending}
                    className="h-11 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-foreground transition-colors hover:border-primary/30 disabled:opacity-60"
                  >
                    {updateOrderMutation.isPending ? "Saving..." : "Apply Order Status"}
                  </button>
                </div>
              </form>

              <form onSubmit={handleReferralStatusSubmit} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-primary/70">Update Referral Status</p>
                <div className="mt-3 grid grid-cols-1 gap-3">
                  <select
                    value={selectedReferralId}
                    onChange={(e) => setSelectedReferralId(e.target.value)}
                    className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none focus:border-primary/40"
                    disabled={referrals.length === 0}
                  >
                    {referrals.length === 0 ? <option value="">No referrals</option> : null}
                    {referrals.map((row) => (
                      <option key={String(row.id)} value={String(row.id)}>
                        {String(row.destinationType || "REFERRAL")} • {String(row.destinationName || "-")}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedReferralStatus}
                    onChange={(e) => setSelectedReferralStatus(e.target.value as (typeof referralStatuses)[number])}
                    className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none focus:border-primary/40"
                  >
                    {referralStatuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <input
                    value={referralNote}
                    onChange={(e) => setReferralNote(e.target.value)}
                    placeholder="Referral note"
                    className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
                  />
                  <button
                    type="submit"
                    disabled={!selectedReferralId || updateReferralMutation.isPending}
                    className="h-11 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-foreground transition-colors hover:border-primary/30 disabled:opacity-60"
                  >
                    {updateReferralMutation.isPending ? "Saving..." : "Apply Referral Status"}
                  </button>
                </div>
              </form>

              <form onSubmit={handleEventSubmit} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-primary/70">Record Clinical Event</p>
                <div className="mt-3 grid grid-cols-1 gap-3">
                  <select
                    value={eventSeverity}
                    onChange={(e) => setEventSeverity(e.target.value as typeof eventSeverity)}
                    className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none focus:border-primary/40"
                  >
                    <option value="INFO">INFO</option>
                    <option value="WARNING">WARNING</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                  <input
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="Event title"
                    className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
                    required
                  />
                  <input
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    placeholder="Optional description"
                    className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
                  />
                  <button
                    type="submit"
                    disabled={!eventTitle.trim() || createEventMutation.isPending}
                    className="h-11 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-foreground transition-colors hover:border-primary/30 disabled:opacity-60"
                  >
                    {createEventMutation.isPending ? "Saving..." : "Record Event"}
                  </button>
                </div>
              </form>

              {isDoctor ? (
                <>
                  <form onSubmit={handleStageSubmit} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-primary/70">Update Lifecycle Stage</p>
                    <div className="mt-3 grid grid-cols-1 gap-3">
                      <select
                        value={nextStage}
                        onChange={(e) => setNextStage(Number(e.target.value))}
                        className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none focus:border-primary/40"
                      >
                        {Array.from({ length: 10 }, (_, idx) => idx + 1).map((stage) => (
                          <option key={stage} value={stage}>Stage {stage}</option>
                        ))}
                      </select>
                      <input
                        value={stageReason}
                        onChange={(e) => setStageReason(e.target.value)}
                        placeholder="Stage transition reason"
                        className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
                      />
                      <button
                        type="submit"
                        disabled={updateStageMutation.isPending}
                        className="h-11 rounded-xl border border-primary/30 bg-primary/10 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
                      >
                        {updateStageMutation.isPending ? "Updating..." : "Update Stage"}
                      </button>
                    </div>
                  </form>

                  <form onSubmit={handleCreateOrder} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-primary/70">Create Order</p>
                    <div className="mt-3 grid grid-cols-1 gap-3">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <select
                          value={orderType}
                          onChange={(e) => setOrderType(e.target.value as typeof orderType)}
                          className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-xs text-foreground outline-none focus:border-primary/40"
                        >
                          <option value="FOLLOW_UP">FOLLOW_UP</option>
                          <option value="LAB_TEST">LAB_TEST</option>
                          <option value="IMAGING">IMAGING</option>
                          <option value="PROCEDURE">PROCEDURE</option>
                          <option value="MEDICATION">MEDICATION</option>
                          <option value="CONSULTATION">CONSULTATION</option>
                        </select>
                        <select
                          value={orderPriority}
                          onChange={(e) => setOrderPriority(e.target.value as typeof orderPriority)}
                          className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-xs text-foreground outline-none focus:border-primary/40"
                        >
                          <option value="LOW">LOW</option>
                          <option value="MEDIUM">MEDIUM</option>
                          <option value="HIGH">HIGH</option>
                          <option value="STAT">STAT</option>
                        </select>
                      </div>
                      <input
                        value={orderTitle}
                        onChange={(e) => setOrderTitle(e.target.value)}
                        placeholder="Order title"
                        className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
                        required
                      />
                      <select
                        value={orderAssignedSpecialistId}
                        onChange={(e) => setOrderAssignedSpecialistId(e.target.value)}
                        className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none focus:border-primary/40"
                      >
                        <option value="">Unassigned specialist</option>
                        {specialists.map((specialist) => (
                          <option key={String(specialist.id)} value={String(specialist.id)}>
                            {String(specialist.email)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        disabled={createOrderMutation.isPending || !orderTitle.trim()}
                        className="h-11 rounded-xl border border-primary/30 bg-primary/10 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
                      >
                        {createOrderMutation.isPending ? "Creating..." : "Create Order"}
                      </button>
                    </div>
                  </form>

                  <form onSubmit={handleCreateReferral} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-primary/70">Create Referral</p>
                    <div className="mt-3 grid grid-cols-1 gap-3">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <select
                          value={referralPriority}
                          onChange={(e) => setReferralPriority(e.target.value as typeof referralPriority)}
                          className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-xs text-foreground outline-none focus:border-primary/40"
                        >
                          <option value="LOW">LOW</option>
                          <option value="MEDIUM">MEDIUM</option>
                          <option value="HIGH">HIGH</option>
                          <option value="URGENT">URGENT</option>
                        </select>
                        <select
                          value={referralAssignedSpecialistId}
                          onChange={(e) => setReferralAssignedSpecialistId(e.target.value)}
                          className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none focus:border-primary/40"
                        >
                          <option value="">Send to specialist pool</option>
                          {specialists.map((specialist) => (
                            <option key={String(specialist.id)} value={String(specialist.id)}>
                              Assign {String(specialist.email)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        value={referralDestinationName}
                        onChange={(e) => setReferralDestinationName(e.target.value)}
                        placeholder="Destination (for example Specialist Pool)"
                        className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
                        required
                      />
                      <button
                        type="submit"
                        disabled={createReferralMutation.isPending || !referralDestinationName.trim()}
                        className="h-11 rounded-xl border border-primary/30 bg-primary/10 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
                      >
                        {createReferralMutation.isPending ? "Creating..." : "Create Referral"}
                      </button>
                    </div>
                  </form>
                </>
              ) : null}
            </div>
          </Panel>

          {isDoctor ? (
            <Panel
              title="Family Invitation and Consent"
              eyebrow="Consent-First Access"
              description="Invite family members from this patient context. Patient approval controls final activation."
            >
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <form
                  onSubmit={handleInviteFamily}
                  className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-primary/70">Create Invite</p>
                  <div className="mt-3 grid grid-cols-1 gap-3">
                    <input
                      type="email"
                      value={familyInviteEmail}
                      onChange={(e) => setFamilyInviteEmail(e.target.value)}
                      placeholder="family.member@domain.com"
                      className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
                      required
                    />

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <select
                        value={familyInviteAccessLevel}
                        onChange={(e) =>
                          setFamilyInviteAccessLevel(
                            e.target.value as FamilyAccessLevel,
                          )
                        }
                        className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none focus:border-primary/40"
                      >
                        <option value="VIEW_ONLY">VIEW_ONLY</option>
                        <option value="FULL_UPDATES">FULL_UPDATES</option>
                        <option value="EMERGENCY_CONTACT">EMERGENCY_CONTACT</option>
                      </select>
                      <input
                        type="date"
                        value={familyInviteExpiresAt}
                        onChange={(e) => setFamilyInviteExpiresAt(e.target.value)}
                        className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none focus:border-primary/40"
                      />
                    </div>

                    <textarea
                      value={familyInviteConsentNote}
                      onChange={(e) => setFamilyInviteConsentNote(e.target.value)}
                      placeholder="Consent context for patient review"
                      className="min-h-[88px] rounded-xl border border-white/10 bg-background/70 px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
                    />

                    <button
                      type="submit"
                      disabled={inviteFamilyMutation.isPending || !familyInviteEmail.trim()}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
                    >
                      <Mail className="h-4 w-4" strokeWidth={1.8} />
                      {inviteFamilyMutation.isPending ? "Sending..." : "Send Invite"}
                    </button>
                  </div>
                </form>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-primary/70">
                      <Clock3 className="h-4 w-4" strokeWidth={1.8} />
                      Invite Queue
                    </p>
                    <div className="mt-3 space-y-3">
                      {familyInvites.length === 0 && !familyInvitesQuery.isLoading ? (
                        <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-3 text-sm text-muted-foreground">
                          No invites for this patient.
                        </p>
                      ) : null}
                      {familyInvites.slice(0, 5).map((row) => (
                        <article key={row.id} className="rounded-xl border border-white/8 bg-background/50 p-3">
                          <p className="text-sm font-medium text-foreground">{row.familyEmail}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {row.status} • {row.accessLevel}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Expires: {row.expiresAt ? safeDate(row.expiresAt) : "No expiry"}
                          </p>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-primary/70">
                      <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />
                      Active Grants
                    </p>
                    <div className="mt-3 space-y-3">
                      {familyGrants.length === 0 && !familyGrantsQuery.isLoading ? (
                        <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-3 text-sm text-muted-foreground">
                          No granted access yet.
                        </p>
                      ) : null}
                      {familyGrants.slice(0, 5).map((row) => (
                        <article key={row.id} className="rounded-xl border border-white/8 bg-background/50 p-3">
                          <p className="text-sm font-medium text-foreground">{row.familyEmail}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {row.status} • {row.accessLevel}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Expires: {row.expiresAt ? safeDate(row.expiresAt) : "No expiry"}
                          </p>
                          {row.status === "ACTIVE" ? (
                            <button
                              type="button"
                              onClick={() => revokeFamilyMutation.mutate(row.id)}
                              disabled={revokeFamilyMutation.isPending}
                              className="mt-2 inline-flex h-8 items-center rounded-full border border-amber/30 bg-amber/[0.1] px-3 text-xs font-medium text-amber/90 transition-colors hover:bg-amber/[0.16] disabled:opacity-60"
                            >
                              Revoke
                            </button>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-primary/70">
                  <ShieldMinus className="h-4 w-4" strokeWidth={1.8} />
                  Access Audit
                </p>
                <div className="mt-3 space-y-3">
                  {familyAudit.length === 0 && !familyAuditQuery.isLoading ? (
                    <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-3 text-sm text-muted-foreground">
                      No audit activity yet.
                    </p>
                  ) : null}
                  {familyAudit.slice(0, 8).map((row) => (
                    <article key={row.id} className="rounded-xl border border-white/8 bg-background/50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{row.action}</p>
                        <p className="text-xs text-muted-foreground">{safeDate(row.createdAt)}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">Actor: {row.actorEmail}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{row.note || "No note"}</p>
                    </article>
                  ))}
                </div>
              </div>
            </Panel>
          ) : null}

          {timelineQuery.isLoading ? <p className="text-muted-foreground">Loading patient details...</p> : null}
          {timelineQuery.isError ? <p className="text-secondary">Unable to load patient detail timeline.</p> : null}
          {summaryQuery.isError ? <p className="text-secondary">Unable to load workflow summary.</p> : null}
          {isDoctor &&
          (familyInvitesQuery.isError || familyGrantsQuery.isError || familyAuditQuery.isError) ? (
            <p className="text-secondary">Unable to load family consent workflow data.</p>
          ) : null}
        </div>
      </div>

      {updateOrderMutation.isError ||
      updateReferralMutation.isError ||
      createEventMutation.isError ||
      updateStageMutation.isError ||
      createOrderMutation.isError ||
      createReferralMutation.isError ||
      inviteFamilyMutation.isError ||
      revokeFamilyMutation.isError ? (
        <div className="mt-4 rounded-2xl border border-amber/20 bg-amber/[0.08] p-3 text-sm text-amber-100">
          One action failed. Check values and retry.
        </div>
      ) : null}
    </PortalShell>
  );
}
