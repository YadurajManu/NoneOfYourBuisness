import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ClipboardCheck,
  Clock3,
  Filter,
  Search,
  Stethoscope,
  Upload,
} from "lucide-react";
import {
  createReferralHandoff,
  createClinicalEvent,
  createClinicalOrder,
  getMyCaseload,
  getPatientTimeline,
  getPatientWorkflowSummary,
  listActiveSpecialists,
  updatePatientLifecycleStage,
  uploadPatientDocumentForCareTeam,
} from "@/lib/api/client";
import { PortalShell } from "@/portal/portal-shell";
import { Panel } from "@/portal/panel";

type CaseloadPatient = {
  id: string;
  lifecycleStage: number;
  updatedAt: string;
  fhirResource?: unknown;
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

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getPatientName(resource: unknown, fallbackId: string) {
  if (!resource || typeof resource !== "object") {
    return `Patient ${fallbackId.slice(0, 8)}`;
  }

  const typed = resource as {
    name?: Array<{ text?: string; given?: string[]; family?: string }>;
  };
  const primary = typed.name?.[0];
  if (!primary) return `Patient ${fallbackId.slice(0, 8)}`;
  if (primary.text && primary.text.trim().length > 0) return primary.text.trim();

  const fullName = [primary.given?.join(" "), primary.family].filter(Boolean).join(" ").trim();
  return fullName.length > 0 ? fullName : `Patient ${fallbackId.slice(0, 8)}`;
}

function getLifecycleBadge(stage: number) {
  if (stage >= 8) {
    return "border-rose-400/20 bg-rose-400/[0.1] text-rose-200";
  }
  if (stage >= 5) {
    return "border-amber-400/20 bg-amber-400/[0.1] text-amber-200";
  }
  return "border-emerald-400/20 bg-emerald-400/[0.1] text-emerald-200";
}

function asArray<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export default function DoctorCaseloadPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  const [nextStage, setNextStage] = useState(2);
  const [stageReason, setStageReason] = useState("");

  const [eventType, setEventType] = useState<"LAB" | "VITAL" | "MEDICATION" | "ORDER" | "FOLLOW_UP">("VITAL");
  const [eventSeverity, setEventSeverity] = useState<"INFO" | "WARNING" | "CRITICAL">("WARNING");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [raiseAlert, setRaiseAlert] = useState(false);
  const [notifyFamilyEvent, setNotifyFamilyEvent] = useState(false);

  const [orderType, setOrderType] = useState<
    "LAB_TEST" | "IMAGING" | "PROCEDURE" | "MEDICATION" | "CONSULTATION" | "FOLLOW_UP"
  >("FOLLOW_UP");
  const [orderPriority, setOrderPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "STAT">("MEDIUM");
  const [orderTitle, setOrderTitle] = useState("");
  const [orderDescription, setOrderDescription] = useState("");
  const [orderDueAt, setOrderDueAt] = useState("");
  const [orderAssignedSpecialistId, setOrderAssignedSpecialistId] = useState("");
  const [notifyFamilyOrder, setNotifyFamilyOrder] = useState(false);

  const [referralPriority, setReferralPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [referralDestinationName, setReferralDestinationName] = useState("Specialist Pool");
  const [referralReason, setReferralReason] = useState("");
  const [referralDueAt, setReferralDueAt] = useState("");
  const [referralAssignedSpecialistId, setReferralAssignedSpecialistId] = useState("");
  const [notifyFamilyReferral, setNotifyFamilyReferral] = useState(false);

  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const caseloadQuery = useQuery({
    queryKey: ["doctor", "caseload"],
    queryFn: getMyCaseload,
  });

  const specialistsQuery = useQuery({
    queryKey: ["doctor", "specialists"],
    queryFn: listActiveSpecialists,
  });

  const patients = (caseloadQuery.data || []) as CaseloadPatient[];
  const specialists = (specialistsQuery.data || []) as Array<Record<string, unknown>>;

  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      if (stageFilter !== "ALL" && String(patient.lifecycleStage) !== stageFilter) {
        return false;
      }

      if (!deferredSearch.trim()) {
        return true;
      }

      const needle = deferredSearch.toLowerCase().trim();
      const displayName = getPatientName(patient.fhirResource, patient.id).toLowerCase();
      return (
        displayName.includes(needle) ||
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

  useEffect(() => {
    if (!selectedPatient) {
      return;
    }
    setNextStage(Math.min(10, Math.max(1, selectedPatient.lifecycleStage + 1)));
  }, [selectedPatient?.id, selectedPatient?.lifecycleStage]);

  const timelineQuery = useQuery({
    queryKey: ["doctor", "patient-timeline", selectedPatientId],
    queryFn: () => getPatientTimeline(selectedPatientId as string),
    enabled: Boolean(selectedPatientId),
  });

  const summaryQuery = useQuery({
    queryKey: ["doctor", "patient-workflow-summary", selectedPatientId],
    queryFn: () => getPatientWorkflowSummary(selectedPatientId as string),
    enabled: Boolean(selectedPatientId),
  });

  const refreshDoctorData = (patientId: string) => {
    queryClient.invalidateQueries({ queryKey: ["doctor", "caseload"] });
    queryClient.invalidateQueries({ queryKey: ["doctor", "overview"] });
    queryClient.invalidateQueries({ queryKey: ["doctor", "patient-timeline", patientId] });
    queryClient.invalidateQueries({
      queryKey: ["doctor", "patient-workflow-summary", patientId],
    });
  };

  const stageMutation = useMutation({
    mutationFn: (payload: { patientId: string; stage: number; reason?: string }) =>
      updatePatientLifecycleStage(payload.patientId, {
        stage: payload.stage,
        reason: payload.reason,
      }),
    onSuccess: (_, vars) => {
      refreshDoctorData(vars.patientId);
      setStageReason("");
    },
  });

  const eventMutation = useMutation({
    mutationFn: (payload: { patientId: string }) =>
      createClinicalEvent(payload.patientId, {
        type: eventType,
        severity: eventSeverity,
        title: eventTitle,
        description: eventDescription || undefined,
        raiseAlert,
        notifyFamily: notifyFamilyEvent,
        alertPriority: raiseAlert ? "MEDIUM" : undefined,
      }),
    onSuccess: (_, vars) => {
      refreshDoctorData(vars.patientId);
      setEventTitle("");
      setEventDescription("");
      setRaiseAlert(false);
      setNotifyFamilyEvent(false);
    },
  });

  const orderMutation = useMutation({
    mutationFn: (payload: { patientId: string }) =>
      createClinicalOrder(payload.patientId, {
        type: orderType,
        priority: orderPriority,
        title: orderTitle,
        description: orderDescription || undefined,
        dueAt: orderDueAt ? new Date(orderDueAt).toISOString() : undefined,
        assignedToUserId: orderAssignedSpecialistId || undefined,
        notifyFamily: notifyFamilyOrder,
      }),
    onSuccess: (_, vars) => {
      refreshDoctorData(vars.patientId);
      setOrderTitle("");
      setOrderDescription("");
      setOrderDueAt("");
      setOrderAssignedSpecialistId("");
      setNotifyFamilyOrder(false);
    },
  });

  const referralMutation = useMutation({
    mutationFn: (payload: { patientId: string }) =>
      createReferralHandoff(payload.patientId, {
        destinationType: "INTERNAL_PROVIDER",
        destinationName: referralDestinationName.trim() || "Specialist Pool",
        reason: referralReason || undefined,
        priority: referralPriority,
        dueAt: referralDueAt ? new Date(referralDueAt).toISOString() : undefined,
        assignedToUserId: referralAssignedSpecialistId || undefined,
        notifyFamily: notifyFamilyReferral,
      }),
    onSuccess: (_, vars) => {
      refreshDoctorData(vars.patientId);
      setReferralReason("");
      setReferralDueAt("");
      setReferralDestinationName("Specialist Pool");
      setReferralAssignedSpecialistId("");
      setNotifyFamilyReferral(false);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (payload: { patientId: string; file: File }) =>
      uploadPatientDocumentForCareTeam(payload.patientId, payload.file),
    onSuccess: (_, vars) => {
      refreshDoctorData(vars.patientId);
      setUploadFile(null);
    },
  });

  function onStageSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedPatientId) return;
    stageMutation.mutate({
      patientId: selectedPatientId,
      stage: nextStage,
      reason: stageReason || undefined,
    });
  }

  function onEventSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedPatientId) return;
    if (!eventTitle.trim()) return;
    eventMutation.mutate({ patientId: selectedPatientId });
  }

  function onOrderSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedPatientId) return;
    if (!orderTitle.trim()) return;
    orderMutation.mutate({ patientId: selectedPatientId });
  }

  function onUploadSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedPatientId || !uploadFile) return;
    uploadMutation.mutate({ patientId: selectedPatientId, file: uploadFile });
  }

  function onReferralSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedPatientId) return;
    if (!referralDestinationName.trim()) return;
    referralMutation.mutate({ patientId: selectedPatientId });
  }

  const timelineTyped = (timelineQuery.data || {}) as Record<string, unknown>;
  const timelineEvents = asArray<TimelineEvent>(timelineTyped.events).slice(0, 12);

  const summary = (summaryQuery.data || {}) as Partial<WorkflowSummary>;
  const summaryCards = [
    {
      label: "Pending Orders",
      value: toNumber(summary.pendingOrders),
      icon: ClipboardCheck,
    },
    {
      label: "Open Tasks",
      value: toNumber(summary.openTasks),
      icon: Activity,
    },
    {
      label: "Overdue Tasks",
      value: toNumber(summary.overdueTasks),
      icon: Clock3,
    },
    {
      label: "Active Referrals",
      value: toNumber(summary.activeReferrals),
      icon: Stethoscope,
    },
  ];

  return (
    <PortalShell title="Doctor Caseload">
      <Panel
        title="Caseload Command Center"
        eyebrow="Clinical Workflow"
        description="Search and prioritize patients, then execute stage and care operations without leaving this page."
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
                placeholder="Search by name, patient id, or stage"
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

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Filtered</p>
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

      <div className="mt-4 grid grid-cols-1 gap-4 xl:items-start xl:grid-cols-[0.85fr_1.15fr]">
        <Panel
          title="Patient Queue"
          eyebrow="Caseload List"
          description="Select a patient to load timeline and quick clinical actions."
        >
          <div className="space-y-3">
            {filteredPatients.map((patient) => (
              <button
                key={patient.id}
                onClick={() => {
                  startTransition(() => setSelectedPatientId(patient.id));
                }}
                className={`w-full rounded-[22px] border p-4 text-left transition-all ${
                  selectedPatientId === patient.id
                    ? "border-primary/30 bg-primary/[0.08] shadow-[0_0_0_1px_rgba(0,212,200,0.1)]"
                    : "border-white/8 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
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
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getLifecycleBadge(patient.lifecycleStage)}`}
                  >
                    Stage {patient.lifecycleStage}
                  </span>
                </div>
              </button>
            ))}

            {filteredPatients.length === 0 && !caseloadQuery.isLoading ? (
              <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                No patients match current filters.
              </p>
            ) : null}

            {caseloadQuery.isLoading ? (
              <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                Loading patient queue...
              </p>
            ) : null}
            {caseloadQuery.isError ? (
              <p className="rounded-2xl border border-amber/20 bg-amber/[0.08] p-4 text-sm text-amber-100">
                Unable to load caseload.
              </p>
            ) : null}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel
            title={selectedPatient ? getPatientName(selectedPatient.fhirResource, selectedPatient.id) : "Patient Detail"}
            eyebrow="Selected Context"
            description={
              selectedPatient
                ? `Patient ID: ${selectedPatient.id.slice(0, 8)}...`
                : "Choose a patient from the queue to open detail context."
            }
            action={
              selectedPatient ? (
                <Link
                  to={`/portal/doctor/patient/${selectedPatient.id}`}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-primary/30 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
                >
                  Open Full Profile
                </Link>
              ) : null
            }
          >
            {selectedPatient ? (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {summaryCards.map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          {metric.label}
                        </p>
                        <metric.icon className="h-4 w-4 text-primary" strokeWidth={1.8} />
                      </div>
                      <p className="mt-2 font-display text-3xl font-bold tracking-[-0.05em] text-foreground">
                        {metric.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <form
                    onSubmit={onStageSubmit}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-primary/70">Lifecycle update</p>
                    <div className="mt-3 grid grid-cols-1 gap-3">
                      <select
                        value={nextStage}
                        onChange={(e) => setNextStage(Number(e.target.value))}
                        className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
                      >
                        {Array.from({ length: 10 }, (_, idx) => idx + 1).map((stage) => (
                          <option key={stage} value={stage}>
                            Move to stage {stage}
                          </option>
                        ))}
                      </select>
                      <input
                        value={stageReason}
                        onChange={(e) => setStageReason(e.target.value)}
                        placeholder="Optional reason for transition"
                        className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
                      />
                      <button
                        type="submit"
                        disabled={stageMutation.isPending}
                        className="btn-shimmer h-11 rounded-xl text-sm font-semibold text-primary-foreground disabled:opacity-70"
                      >
                        {stageMutation.isPending ? "Updating..." : "Update Stage"}
                      </button>
                    </div>
                  </form>

                  <form
                    onSubmit={onUploadSubmit}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-primary/70">Document upload</p>
                    <div className="mt-3 grid grid-cols-1 gap-3">
                      <label className="flex h-11 cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground">
                        <span className="truncate">
                          {uploadFile ? uploadFile.name : "Select file to upload"}
                        </span>
                        <Upload className="h-4 w-4 text-primary" strokeWidth={1.8} />
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setUploadFile(file);
                          }}
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={!uploadFile || uploadMutation.isPending}
                        className="h-11 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-foreground transition-colors hover:border-primary/30 disabled:opacity-60"
                      >
                        {uploadMutation.isPending ? "Uploading..." : "Upload Document"}
                      </button>
                    </div>
                  </form>

                  <form
                    onSubmit={onEventSubmit}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-primary/70">Clinical event</p>
                    <div className="mt-3 grid grid-cols-1 gap-3">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <select
                          value={eventType}
                          onChange={(e) => setEventType(e.target.value as typeof eventType)}
                          className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-xs text-foreground outline-none focus:border-primary/40"
                        >
                          <option value="LAB">LAB</option>
                          <option value="VITAL">VITAL</option>
                          <option value="MEDICATION">MEDICATION</option>
                          <option value="ORDER">ORDER</option>
                          <option value="FOLLOW_UP">FOLLOW_UP</option>
                        </select>
                        <select
                          value={eventSeverity}
                          onChange={(e) => setEventSeverity(e.target.value as typeof eventSeverity)}
                          className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-xs text-foreground outline-none focus:border-primary/40"
                        >
                          <option value="INFO">INFO</option>
                          <option value="WARNING">WARNING</option>
                          <option value="CRITICAL">CRITICAL</option>
                        </select>
                      </div>
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
                        placeholder="Short description (optional)"
                        className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
                      />
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={raiseAlert}
                          onChange={(e) => setRaiseAlert(e.target.checked)}
                          className="h-4 w-4 rounded border-white/20 bg-background"
                        />
                        Raise alert
                      </label>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={notifyFamilyEvent}
                          onChange={(e) => setNotifyFamilyEvent(e.target.checked)}
                          className="h-4 w-4 rounded border-white/20 bg-background"
                        />
                        Notify family
                      </label>
                      <button
                        type="submit"
                        disabled={eventMutation.isPending}
                        className="h-11 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-foreground transition-colors hover:border-primary/30 disabled:opacity-70"
                      >
                        {eventMutation.isPending ? "Saving..." : "Record Event"}
                      </button>
                    </div>
                  </form>

                  <form
                    onSubmit={onOrderSubmit}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-primary/70">Clinical order</p>
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
                      <input
                        value={orderDescription}
                        onChange={(e) => setOrderDescription(e.target.value)}
                        placeholder="Order details (optional)"
                        className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
                      />
                      <input
                        type="datetime-local"
                        value={orderDueAt}
                        onChange={(e) => setOrderDueAt(e.target.value)}
                        className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none focus:border-primary/40"
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
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={notifyFamilyOrder}
                          onChange={(e) => setNotifyFamilyOrder(e.target.checked)}
                          className="h-4 w-4 rounded border-white/20 bg-background"
                        />
                        Notify family
                      </label>
                      <button
                        type="submit"
                        disabled={orderMutation.isPending}
                        className="h-11 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-foreground transition-colors hover:border-primary/30 disabled:opacity-70"
                      >
                        {orderMutation.isPending ? "Saving..." : "Create Order"}
                      </button>
                    </div>
                  </form>

                  <form
                    onSubmit={onReferralSubmit}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-primary/70">Specialist referral</p>
                    <div className="mt-3 grid grid-cols-1 gap-3">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <select
                          value={referralPriority}
                          onChange={(e) =>
                            setReferralPriority(e.target.value as typeof referralPriority)
                          }
                          className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-xs text-foreground outline-none focus:border-primary/40"
                        >
                          <option value="LOW">LOW</option>
                          <option value="MEDIUM">MEDIUM</option>
                          <option value="HIGH">HIGH</option>
                          <option value="URGENT">URGENT</option>
                        </select>
                        <input
                          type="datetime-local"
                          value={referralDueAt}
                          onChange={(e) => setReferralDueAt(e.target.value)}
                          className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-xs text-foreground outline-none focus:border-primary/40"
                        />
                      </div>
                      <input
                        value={referralDestinationName}
                        onChange={(e) => setReferralDestinationName(e.target.value)}
                        placeholder="Destination (for example Specialist Pool)"
                        className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
                        required
                      />
                      <select
                        value={referralAssignedSpecialistId}
                        onChange={(e) => setReferralAssignedSpecialistId(e.target.value)}
                        className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none focus:border-primary/40"
                      >
                        <option value="">Send to specialist pool (unassigned)</option>
                        {specialists.map((specialist) => (
                          <option key={String(specialist.id)} value={String(specialist.id)}>
                            Assign {String(specialist.email)}
                          </option>
                        ))}
                      </select>
                      <input
                        value={referralReason}
                        onChange={(e) => setReferralReason(e.target.value)}
                        placeholder="Reason (optional)"
                        className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
                      />
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={notifyFamilyReferral}
                          onChange={(e) => setNotifyFamilyReferral(e.target.checked)}
                          className="h-4 w-4 rounded border-white/20 bg-background"
                        />
                        Notify family
                      </label>
                      <button
                        type="submit"
                        disabled={referralMutation.isPending}
                        className="h-11 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-foreground transition-colors hover:border-primary/30 disabled:opacity-70"
                      >
                        {referralMutation.isPending ? "Saving..." : "Create Referral"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                Select a patient from the queue to load actions and timeline.
              </div>
            )}

            {stageMutation.isError ||
            eventMutation.isError ||
            orderMutation.isError ||
            referralMutation.isError ||
            uploadMutation.isError ? (
              <div className="mt-4 rounded-2xl border border-amber/20 bg-amber/[0.08] p-3 text-sm text-amber-100">
                One action failed. Check required fields and retry.
              </div>
            ) : null}
          </Panel>

          <Panel
            title="Patient Timeline"
            eyebrow="Recent Activity"
            description="Latest lifecycle, document, and clinical events for selected patient."
          >
            {timelineEvents.length > 0 ? (
              <div className="space-y-3">
                {timelineEvents.map((event, idx) => (
                  <div
                    key={`${event.type}-${event.at}-${idx}`}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.18em] text-primary/70">{event.type}</p>
                        <p className="mt-1 text-sm text-foreground/90">{event.detail}</p>
                      </div>
                      <div className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-muted-foreground">
                        {new Date(event.at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                {timelineQuery.isLoading
                  ? "Loading timeline..."
                  : "No timeline events available for this patient yet."}
              </div>
            )}

            {timelineQuery.isError ? (
              <div className="mt-3 rounded-2xl border border-amber/20 bg-amber/[0.08] p-3 text-sm text-amber-100">
                Unable to load patient timeline.
              </div>
            ) : null}
          </Panel>
        </div>
      </div>
    </PortalShell>
  );
}
