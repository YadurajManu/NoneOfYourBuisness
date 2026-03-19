import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Filter,
  Hand,
  RefreshCw,
  Search,
  Stethoscope,
  Upload,
} from "lucide-react";
import {
  claimReferralFromPool,
  createClinicalEvent,
  getMyCaseload,
  getPatientTimeline,
  getPatientWorkflowSummary,
  listClaimableReferralPool,
  listPatientAlerts,
  listPatientOrders,
  listPatientReferrals,
  uploadPatientDocumentForCareTeam,
  updateClinicalOrderStatus,
  updateReferralStatus,
} from "@/lib/api/client";
import { PortalShell } from "@/portal/portal-shell";
import { Panel } from "@/portal/panel";

type CaseloadPatient = {
  id: string;
  lifecycleStage: number;
  updatedAt: string;
  fhirResource?: unknown;
};

type PatientOrder = {
  id: string;
  type: string;
  status: string;
  title: string;
  createdAt: string;
};

type PatientReferral = {
  id: string;
  destinationType: string;
  destinationName: string;
  status: string;
  createdAt: string;
};

type PoolReferral = {
  id: string;
  destinationType: string;
  destinationName: string;
  priority: string;
  status: string;
  dueAt: string | null;
  patientId: string;
  patientStage: number;
  patientName: string;
};

type PatientAlert = {
  id: string;
  priority: string;
  status: string;
  title: string;
};

type TimelineEvent = {
  type: string;
  at: string;
  detail: string;
};

type WorkflowSummary = {
  pendingOrders: number;
  escalatedOrders: number;
  openTasks: number;
  overdueTasks: number;
  pendingPriorAuthorizations: number;
  activeReferrals: number;
  overdueReferrals: number;
};

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

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asArray<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
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

function badgeForStage(stage: number) {
  if (stage >= 8) return "border-rose-400/20 bg-rose-400/[0.1] text-rose-200";
  if (stage >= 5) return "border-amber-400/20 bg-amber-400/[0.1] text-amber-200";
  return "border-emerald-400/20 bg-emerald-400/[0.1] text-emerald-200";
}

function alertBadge(priority: string) {
  switch (priority) {
    case "CRITICAL":
      return "border-rose-400/20 bg-rose-400/[0.1] text-rose-200";
    case "HIGH":
      return "border-amber-400/20 bg-amber-400/[0.1] text-amber-200";
    default:
      return "border-cyan-400/20 bg-cyan-400/[0.1] text-cyan-200";
  }
}

export default function SpecialistCaseloadPage() {
  const qc = useQueryClient();
  const actionsPanelRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");
  const deferredSearch = useDeferredValue(search);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedOrderStatus, setSelectedOrderStatus] =
    useState<(typeof orderStatuses)[number]>("IN_PROGRESS");
  const [orderNote, setOrderNote] = useState("");
  const [orderNotifyFamily, setOrderNotifyFamily] = useState(false);

  const [selectedReferralId, setSelectedReferralId] = useState("");
  const [selectedReferralStatus, setSelectedReferralStatus] =
    useState<(typeof referralStatuses)[number]>("IN_PROGRESS");
  const [referralNote, setReferralNote] = useState("");
  const [referralNotifyFamily, setReferralNotifyFamily] = useState(false);

  const [eventSeverity, setEventSeverity] = useState<"INFO" | "WARNING" | "CRITICAL">("WARNING");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventNotifyFamily, setEventNotifyFamily] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const caseloadQuery = useQuery({
    queryKey: ["specialist", "caseload"],
    queryFn: getMyCaseload,
  });

  const patients = (caseloadQuery.data || []) as CaseloadPatient[];

  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      if (stageFilter !== "ALL" && String(patient.lifecycleStage) !== stageFilter) return false;
      if (!deferredSearch.trim()) return true;

      const needle = deferredSearch.trim().toLowerCase();
      const patientName = getPatientName(patient.fhirResource, patient.id).toLowerCase();
      return (
        patientName.includes(needle) ||
        patient.id.toLowerCase().includes(needle) ||
        String(patient.lifecycleStage).includes(needle)
      );
    });
  }, [patients, stageFilter, deferredSearch]);

  useEffect(() => {
    if (filteredPatients.length === 0) {
      setSelectedPatientId(null);
      return;
    }
    const exists = filteredPatients.some((patient) => patient.id === selectedPatientId);
    if (!selectedPatientId || !exists) {
      setSelectedPatientId(filteredPatients[0].id);
    }
  }, [filteredPatients, selectedPatientId]);

  const selectedPatient =
    filteredPatients.find((patient) => patient.id === selectedPatientId) ||
    patients.find((patient) => patient.id === selectedPatientId) ||
    null;

  const timelineQuery = useQuery({
    queryKey: ["specialist", "timeline", selectedPatientId],
    queryFn: () => getPatientTimeline(selectedPatientId as string),
    enabled: Boolean(selectedPatientId),
  });

  const workflowQuery = useQuery({
    queryKey: ["specialist", "workflow-summary", selectedPatientId],
    queryFn: () => getPatientWorkflowSummary(selectedPatientId as string),
    enabled: Boolean(selectedPatientId),
  });

  const ordersQuery = useQuery({
    queryKey: ["specialist", "orders", selectedPatientId],
    queryFn: () => listPatientOrders(selectedPatientId as string),
    enabled: Boolean(selectedPatientId),
  });

  const referralsQuery = useQuery({
    queryKey: ["specialist", "referrals", selectedPatientId],
    queryFn: () => listPatientReferrals(selectedPatientId as string),
    enabled: Boolean(selectedPatientId),
  });

  const alertsQuery = useQuery({
    queryKey: ["specialist", "alerts", selectedPatientId],
    queryFn: () => listPatientAlerts(selectedPatientId as string),
    enabled: Boolean(selectedPatientId),
  });

  const referralPoolQuery = useQuery({
    queryKey: ["specialist", "referral-pool"],
    queryFn: listClaimableReferralPool,
  });

  const refreshPatientQueries = (patientId: string) => {
    qc.invalidateQueries({ queryKey: ["specialist", "caseload"] });
    qc.invalidateQueries({ queryKey: ["specialist", "overview"] });
    qc.invalidateQueries({ queryKey: ["specialist", "timeline", patientId] });
    qc.invalidateQueries({ queryKey: ["specialist", "workflow-summary", patientId] });
    qc.invalidateQueries({ queryKey: ["specialist", "orders", patientId] });
    qc.invalidateQueries({ queryKey: ["specialist", "referrals", patientId] });
    qc.invalidateQueries({ queryKey: ["specialist", "alerts", patientId] });
  };

  const updateOrderMutation = useMutation({
    mutationFn: (payload: { orderId: string; status: (typeof orderStatuses)[number]; note?: string; notifyFamily?: boolean }) =>
      updateClinicalOrderStatus(payload.orderId, {
        status: payload.status,
        note: payload.note,
        notifyFamily: payload.notifyFamily,
      }),
    onSuccess: () => {
      if (selectedPatientId) {
        refreshPatientQueries(selectedPatientId);
      }
      setOrderNote("");
    },
  });

  const updateReferralMutation = useMutation({
    mutationFn: (payload: {
      referralId: string;
      status: (typeof referralStatuses)[number];
      note?: string;
      notifyFamily?: boolean;
    }) =>
      updateReferralStatus(payload.referralId, {
        status: payload.status,
        note: payload.note,
        notifyFamily: payload.notifyFamily,
      }),
    onSuccess: () => {
      if (selectedPatientId) {
        refreshPatientQueries(selectedPatientId);
      }
      setReferralNote("");
    },
  });

  const createEventMutation = useMutation({
    mutationFn: (payload: { patientId: string }) =>
      createClinicalEvent(payload.patientId, {
        type: "FOLLOW_UP",
        severity: eventSeverity,
        title: eventTitle,
        description: eventDescription || undefined,
        notifyFamily: eventNotifyFamily,
        raiseAlert: eventSeverity === "CRITICAL",
      }),
    onSuccess: (_, vars) => {
      refreshPatientQueries(vars.patientId);
      setEventTitle("");
      setEventDescription("");
      setEventNotifyFamily(false);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (payload: { patientId: string; file: File }) =>
      uploadPatientDocumentForCareTeam(payload.patientId, payload.file),
    onSuccess: (_, vars) => {
      refreshPatientQueries(vars.patientId);
      setUploadFile(null);
    },
  });

  const claimReferralMutation = useMutation({
    mutationFn: (referralId: string) => claimReferralFromPool(referralId, "Claimed from specialist pool in portal"),
    onSuccess: (data) => {
      const typed = data as Record<string, unknown>;
      const patientId = String(typed.patientId || "");
      qc.invalidateQueries({ queryKey: ["specialist", "caseload"] });
      qc.invalidateQueries({ queryKey: ["specialist", "overview"] });
      qc.invalidateQueries({ queryKey: ["specialist", "referral-pool"] });
      if (patientId) {
        setSelectedPatientId(patientId);
        refreshPatientQueries(patientId);
      }
    },
  });

  const orders = useMemo(() => {
    return asArray<Record<string, unknown>>(ordersQuery.data).map((row) => ({
      id: String(row.id || ""),
      type: String(row.type || "ORDER"),
      status: String(row.status || "ACTIVE"),
      title: String(row.title || "Untitled order"),
      createdAt: String(row.createdAt || ""),
    })) as PatientOrder[];
  }, [ordersQuery.data]);

  const referrals = useMemo(() => {
    return asArray<Record<string, unknown>>(referralsQuery.data).map((row) => ({
      id: String(row.id || ""),
      destinationType: String(row.destinationType || "REFERRAL"),
      destinationName: String(row.destinationName || "Unknown destination"),
      status: String(row.status || "CREATED"),
      createdAt: String(row.createdAt || ""),
    })) as PatientReferral[];
  }, [referralsQuery.data]);

  const alerts = useMemo(() => {
    return asArray<Record<string, unknown>>(alertsQuery.data).map((row) => ({
      id: String(row.id || ""),
      priority: String(row.priority || "MEDIUM"),
      status: String(row.status || "OPEN"),
      title: String(row.title || "Clinical alert"),
    })) as PatientAlert[];
  }, [alertsQuery.data]);

  const poolReferrals = useMemo(() => {
    return asArray<Record<string, unknown>>(referralPoolQuery.data).map((row) => {
      const patient = (row.patient || {}) as Record<string, unknown>;
      const patientId = String(patient.id || "");

      return {
        id: String(row.id || ""),
        destinationType: String(row.destinationType || "REFERRAL"),
        destinationName: String(row.destinationName || "Specialist Pool"),
        priority: String(row.priority || "MEDIUM"),
        status: String(row.status || "CREATED"),
        dueAt: row.dueAt ? String(row.dueAt) : null,
        patientId,
        patientStage: Number(patient.lifecycleStage || 0),
        patientName: getPatientName(patient.fhirResource, patientId),
      } as PoolReferral;
    });
  }, [referralPoolQuery.data]);

  useEffect(() => {
    if (orders.length > 0) {
      const exists = orders.some((order) => order.id === selectedOrderId);
      if (!exists) {
        setSelectedOrderId(orders[0].id);
      }
    } else {
      setSelectedOrderId("");
    }
  }, [orders, selectedOrderId]);

  useEffect(() => {
    if (referrals.length > 0) {
      const exists = referrals.some((referral) => referral.id === selectedReferralId);
      if (!exists) {
        setSelectedReferralId(referrals[0].id);
      }
    } else {
      setSelectedReferralId("");
    }
  }, [referrals, selectedReferralId]);

  const timelineTyped = (timelineQuery.data || {}) as Record<string, unknown>;
  const timelineEvents = asArray<TimelineEvent>(timelineTyped.events).slice(0, 10);
  const workflow = (workflowQuery.data || {}) as Partial<WorkflowSummary>;

  function handleUpdateOrder(e: FormEvent) {
    e.preventDefault();
    if (!selectedOrderId) return;
    updateOrderMutation.mutate({
      orderId: selectedOrderId,
      status: selectedOrderStatus,
      note: orderNote || undefined,
      notifyFamily: orderNotifyFamily,
    });
  }

  function handleUpdateReferral(e: FormEvent) {
    e.preventDefault();
    if (!selectedReferralId) return;
    updateReferralMutation.mutate({
      referralId: selectedReferralId,
      status: selectedReferralStatus,
      note: referralNote || undefined,
      notifyFamily: referralNotifyFamily,
    });
  }

  function handleCreateEvent(e: FormEvent) {
    e.preventDefault();
    if (!selectedPatientId || !eventTitle.trim()) return;
    createEventMutation.mutate({ patientId: selectedPatientId });
  }

  function handleUploadDocument(e: FormEvent) {
    e.preventDefault();
    if (!selectedPatientId || !uploadFile) return;
    uploadMutation.mutate({ patientId: selectedPatientId, file: uploadFile });
  }

  function handleSelectPatient(patientId: string) {
    startTransition(() => setSelectedPatientId(patientId));

    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1279px)").matches) {
      setTimeout(() => {
        actionsPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }

  return (
    <PortalShell title="Specialist Caseload">
      <Panel
        title="Specialist Command Center"
        eyebrow="Assigned Patients"
        description="Operate on referral and order bottlenecks while keeping patient context visible."
      >
        <div className="grid grid-cols-1 items-end gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <Search className="h-4 w-4 text-primary" strokeWidth={1.8} />
                Search
              </p>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by patient name, id, or stage"
                className="h-12 w-full rounded-2xl border border-white/10 bg-background/70 px-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
              />
            </div>
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <Filter className="h-4 w-4 text-primary" strokeWidth={1.8} />
                Stage Filter
              </p>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="h-12 w-full rounded-2xl border border-white/10 bg-background/70 px-4 text-sm text-foreground outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
              >
                <option value="ALL">All stages</option>
                {Array.from({ length: 10 }, (_, idx) => idx + 1).map((stage) => (
                  <option key={stage} value={String(stage)}>
                    Stage {stage}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Queue</p>
              <p className="mt-2 font-display text-3xl font-bold tracking-[-0.05em] text-foreground">
                {filteredPatients.length}
              </p>
            </div>
            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.08] p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-rose-200/90">High Stage</p>
              <p className="mt-2 font-display text-3xl font-bold tracking-[-0.05em] text-foreground">
                {filteredPatients.filter((patient) => patient.lifecycleStage >= 8).length}
              </p>
            </div>
          </div>
        </div>
      </Panel>

      <Panel
        title="Specialist Pool"
        eyebrow="Unassigned Referrals"
        description="Claim referrals from the shared pool to pull those patients into your specialist queue."
        className="mt-4"
      >
        <div className="space-y-3">
          {poolReferrals.length === 0 && !referralPoolQuery.isLoading ? (
            <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
              No unassigned specialist referrals in pool.
            </p>
          ) : null}

          {poolReferrals.slice(0, 8).map((referral) => (
            <div
              key={referral.id}
              className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {referral.patientName} • Stage {referral.patientStage}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {referral.destinationType} to {referral.destinationName}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {referral.priority} • {referral.status}
                  {referral.dueAt ? ` • Due ${new Date(referral.dueAt).toLocaleString()}` : ""}
                </p>
              </div>
              <button
                onClick={() => claimReferralMutation.mutate(referral.id)}
                disabled={claimReferralMutation.isPending}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
              >
                <Hand className="h-4 w-4" strokeWidth={1.8} />
                {claimReferralMutation.isPending ? "Claiming..." : "Claim Referral"}
              </button>
            </div>
          ))}

          {referralPoolQuery.isLoading ? (
            <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
              Loading specialist pool...
            </p>
          ) : null}
        </div>
      </Panel>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:items-start xl:grid-cols-[0.78fr_1.22fr]">
        <Panel
          title="Assigned Specialist Queue"
          eyebrow="Patient List"
          description="Select a patient to manage referrals, orders, and specialist event logs. On smaller screens, actions are shown below this list."
        >
          <div className="space-y-3">
            {filteredPatients.map((patient) => (
              <button
                key={patient.id}
                onClick={() => handleSelectPatient(patient.id)}
                className={`w-full rounded-[22px] border p-4 text-left transition-all ${
                  selectedPatientId === patient.id
                    ? "cursor-default border-primary/30 bg-primary/[0.08] shadow-[0_0_0_1px_rgba(0,212,200,0.1)]"
                    : "cursor-pointer border-white/8 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04] active:scale-[0.998]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-semibold tracking-[-0.03em] text-foreground">
                      {getPatientName(patient.fhirResource, patient.id)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">ID: {patient.id}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Updated {new Date(patient.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${badgeForStage(patient.lifecycleStage)}`}>
                    Stage {patient.lifecycleStage}
                  </span>
                </div>
                {selectedPatientId === patient.id ? (
                  <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-primary/80">
                    Selected
                  </p>
                ) : null}
              </button>
            ))}

            {filteredPatients.length === 0 && !caseloadQuery.isLoading ? (
              <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                No specialist patients match this filter.
              </p>
            ) : null}
            {caseloadQuery.isLoading ? (
              <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                Loading specialist queue...
              </p>
            ) : null}
          </div>
        </Panel>

        <div ref={actionsPanelRef} className="space-y-4">
          <Panel
            title={selectedPatient ? getPatientName(selectedPatient.fhirResource, selectedPatient.id) : "Patient Detail"}
            eyebrow="Specialist Actions"
            description={
              selectedPatient
                ? `Patient ID: ${selectedPatient.id}`
                : "Select a patient from the queue to open specialist actions."
            }
            action={
              selectedPatient ? (
                <Link
                  to={`/portal/specialist/patient/${selectedPatient.id}`}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-primary/30 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
                >
                  Open Full Profile
                </Link>
              ) : null
            }
          >
            {selectedPatient ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    { label: "Pending Orders", value: toNumber(workflow.pendingOrders), icon: ClipboardCheck },
                    { label: "Escalated Orders", value: toNumber(workflow.escalatedOrders), icon: AlertTriangle },
                    { label: "Active Referrals", value: toNumber(workflow.activeReferrals), icon: Stethoscope },
                    { label: "Overdue Referrals", value: toNumber(workflow.overdueReferrals), icon: RefreshCw },
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{metric.label}</p>
                        <metric.icon className="h-4 w-4 text-primary" strokeWidth={1.8} />
                      </div>
                      <p className="mt-2 font-display text-3xl font-bold tracking-[-0.05em] text-foreground">{metric.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <form onSubmit={handleUpdateReferral} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-primary/70">Update referral</p>
                    <div className="mt-3 grid grid-cols-1 gap-3">
                      <select
                        value={selectedReferralId}
                        onChange={(e) => setSelectedReferralId(e.target.value)}
                        className="h-10 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none focus:border-primary/40"
                        disabled={referrals.length === 0}
                      >
                        {referrals.length === 0 ? <option value="">No referrals</option> : null}
                        {referrals.map((referral) => (
                          <option key={referral.id} value={referral.id}>
                            {referral.destinationType} • {referral.destinationName.slice(0, 32)}
                          </option>
                        ))}
                      </select>
                      <select
                        value={selectedReferralStatus}
                        onChange={(e) => setSelectedReferralStatus(e.target.value as (typeof referralStatuses)[number])}
                        className="h-10 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none focus:border-primary/40"
                      >
                        {referralStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <input
                        value={referralNote}
                        onChange={(e) => setReferralNote(e.target.value)}
                        placeholder="Referral note"
                        className="h-10 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
                      />
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={referralNotifyFamily}
                          onChange={(e) => setReferralNotifyFamily(e.target.checked)}
                          className="h-4 w-4 rounded border-white/20 bg-background"
                        />
                        Notify family
                      </label>
                      <button
                        type="submit"
                        disabled={!selectedReferralId || updateReferralMutation.isPending}
                        className="h-10 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-foreground transition-colors hover:border-primary/30 disabled:opacity-60"
                      >
                        {updateReferralMutation.isPending ? "Saving..." : "Apply Referral Status"}
                      </button>
                    </div>
                  </form>

                  <form onSubmit={handleUpdateOrder} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-primary/70">Update order</p>
                    <div className="mt-3 grid grid-cols-1 gap-3">
                      <select
                        value={selectedOrderId}
                        onChange={(e) => setSelectedOrderId(e.target.value)}
                        className="h-10 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none focus:border-primary/40"
                        disabled={orders.length === 0}
                      >
                        {orders.length === 0 ? <option value="">No orders</option> : null}
                        {orders.map((order) => (
                          <option key={order.id} value={order.id}>
                            {order.type} • {order.title.slice(0, 28)}
                          </option>
                        ))}
                      </select>
                      <select
                        value={selectedOrderStatus}
                        onChange={(e) => setSelectedOrderStatus(e.target.value as (typeof orderStatuses)[number])}
                        className="h-10 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none focus:border-primary/40"
                      >
                        {orderStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <input
                        value={orderNote}
                        onChange={(e) => setOrderNote(e.target.value)}
                        placeholder="Order note"
                        className="h-10 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
                      />
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={orderNotifyFamily}
                          onChange={(e) => setOrderNotifyFamily(e.target.checked)}
                          className="h-4 w-4 rounded border-white/20 bg-background"
                        />
                        Notify family
                      </label>
                      <button
                        type="submit"
                        disabled={!selectedOrderId || updateOrderMutation.isPending}
                        className="h-10 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-foreground transition-colors hover:border-primary/30 disabled:opacity-60"
                      >
                        {updateOrderMutation.isPending ? "Saving..." : "Apply Order Status"}
                      </button>
                    </div>
                  </form>

                  <form onSubmit={handleCreateEvent} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-primary/70">Specialist event</p>
                    <div className="mt-3 grid grid-cols-1 gap-3">
                      <select
                        value={eventSeverity}
                        onChange={(e) => setEventSeverity(e.target.value as typeof eventSeverity)}
                        className="h-10 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none focus:border-primary/40"
                      >
                        <option value="INFO">INFO</option>
                        <option value="WARNING">WARNING</option>
                        <option value="CRITICAL">CRITICAL</option>
                      </select>
                      <input
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        placeholder="Specialist note title"
                        className="h-10 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
                      />
                      <input
                        value={eventDescription}
                        onChange={(e) => setEventDescription(e.target.value)}
                        placeholder="Details (optional)"
                        className="h-10 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
                      />
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={eventNotifyFamily}
                          onChange={(e) => setEventNotifyFamily(e.target.checked)}
                          className="h-4 w-4 rounded border-white/20 bg-background"
                        />
                        Notify family
                      </label>
                      <button
                        type="submit"
                        disabled={!eventTitle.trim() || createEventMutation.isPending}
                        className="h-10 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-foreground transition-colors hover:border-primary/30 disabled:opacity-60"
                      >
                        {createEventMutation.isPending ? "Saving..." : "Record Specialist Event"}
                      </button>
                    </div>
                  </form>

                  <form onSubmit={handleUploadDocument} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-primary/70">Report upload</p>
                    <div className="mt-3 grid grid-cols-1 gap-3">
                      <label className="flex h-10 cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground">
                        <span className="truncate pr-3">
                          {uploadFile ? uploadFile.name : "Upload report photo or PDF"}
                        </span>
                        <Upload className="h-4 w-4 text-primary" strokeWidth={1.8} />
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        />
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Mobile camera capture is enabled for bedside report photos.
                      </p>
                      <button
                        type="submit"
                        disabled={!uploadFile || uploadMutation.isPending}
                        className="h-10 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-foreground transition-colors hover:border-primary/30 disabled:opacity-60"
                      >
                        {uploadMutation.isPending ? "Uploading..." : "Upload Report"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                Select a specialist patient from the queue to begin.
              </div>
            )}
          </Panel>

          <Panel
            title="Patient Timeline and Alert Context"
            eyebrow="Context Stream"
            description="Timeline facts plus current alert priorities for the selected patient."
          >
            <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Timeline</p>
                {timelineEvents.length === 0 ? (
                  <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-3 text-sm text-muted-foreground">
                    {timelineQuery.isLoading ? "Loading timeline..." : "No timeline events."}
                  </p>
                ) : (
                  timelineEvents.map((event, idx) => (
                    <div key={`${event.type}-${event.at}-${idx}`} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-primary/70">{event.type}</p>
                      <p className="mt-1 text-sm text-foreground/90">{event.detail}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{new Date(event.at).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Alerts</p>
                {alerts.length === 0 ? (
                  <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-3 text-sm text-muted-foreground">
                    {alertsQuery.isLoading ? "Loading alerts..." : "No active alerts for this patient."}
                  </p>
                ) : (
                  alerts.map((alert) => (
                    <div key={alert.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-foreground/90">{alert.title}</p>
                        <span className={`rounded-full border px-2 py-1 text-[11px] font-medium ${alertBadge(alert.priority)}`}>
                          {alert.priority}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">Status: {alert.status}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </PortalShell>
  );
}
