import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BriefcaseMedical,
  ClipboardCheck,
  Clock3,
  Layers3,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { getDashboardOverview, getMyCaseload, listOpenClinicalAlerts } from "@/lib/api/client";
import { PortalShell } from "@/portal/portal-shell";
import { Panel } from "@/portal/panel";

type CaseloadPatient = {
  id: string;
  lifecycleStage: number;
  updatedAt: string;
  fhirResource?: unknown;
};

type AlertRow = {
  id: string;
  patientId: string;
  priority?: string;
  status?: string;
  title?: string;
  createdAt?: string;
};

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
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

function statusStyle(priority?: string) {
  switch (priority) {
    case "CRITICAL":
      return "border-rose-400/25 bg-rose-400/[0.12] text-rose-200";
    case "HIGH":
      return "border-amber-400/25 bg-amber-400/[0.12] text-amber-200";
    case "MEDIUM":
      return "border-cyan-400/20 bg-cyan-400/[0.1] text-cyan-200";
    default:
      return "border-white/10 bg-white/[0.05] text-foreground";
  }
}

export default function SpecialistDashboardPage() {
  const overview = useQuery({
    queryKey: ["specialist", "overview"],
    queryFn: getDashboardOverview,
  });

  const caseload = useQuery({
    queryKey: ["specialist", "caseload"],
    queryFn: getMyCaseload,
  });

  const openAlerts = useQuery({
    queryKey: ["specialist", "open-alerts"],
    queryFn: listOpenClinicalAlerts,
  });

  const typedOverview = (overview.data || {}) as { totals?: Record<string, unknown> };
  const totals = typedOverview.totals || {};
  const specialistPatients = (caseload.data || []) as CaseloadPatient[];
  const alertRows = (openAlerts.data || []) as Array<Record<string, unknown>>;

  const alerts = useMemo(() => {
    return alertRows
      .map((row) => ({
        id: String(row.id || ""),
        patientId: String(row.patientId || ""),
        priority: row.priority ? String(row.priority) : undefined,
        status: row.status ? String(row.status) : undefined,
        title: row.title ? String(row.title) : undefined,
        createdAt: row.createdAt ? String(row.createdAt) : undefined,
      }) as AlertRow)
      .slice(0, 8);
  }, [alertRows]);

  const criticalAlerts = alerts.filter((alert) => alert.priority === "CRITICAL").length;
  const highStageCaseload = specialistPatients.filter((patient) => patient.lifecycleStage >= 8).length;
  const recentPatients = specialistPatients.slice(0, 8);

  return (
    <PortalShell title="Specialist Dashboard">
      <Panel
        title="Specialist Operations Pulse"
        eyebrow="Focused Caseload"
        description="Track assigned specialist workload, escalate risk early, and keep referrals moving."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            {
              label: "Assigned Caseload",
              value: specialistPatients.length,
              hint: "Patients routed through specialist assignments",
              icon: Stethoscope,
            },
            {
              label: "Critical Alerts",
              value: criticalAlerts,
              hint: "Immediate clinical escalation",
              icon: ShieldAlert,
            },
            {
              label: "High Stage Patients",
              value: highStageCaseload,
              hint: "Lifecycle stage 8-10",
              icon: AlertTriangle,
            },
            {
              label: "Escalated Orders",
              value: toNumber(totals.escalatedClinicalOrders),
              hint: "Order-level intervention needed",
              icon: ClipboardCheck,
            },
            {
              label: "Active Referrals",
              value: toNumber(totals.activeReferrals),
              hint: "Handoffs in progress",
              icon: Layers3,
            },
            {
              label: "Overdue Referrals",
              value: toNumber(totals.overdueReferrals),
              hint: "Potential care delay",
              icon: Clock3,
            },
          ].map((metric) => (
            <div key={metric.label} className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{metric.label}</p>
                  <p className="mt-3 font-display text-4xl font-bold tracking-[-0.05em] text-foreground">{metric.value}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <metric.icon className="h-5 w-5" strokeWidth={1.8} />
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{metric.hint}</p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel
          title="Open Alert Feed"
          eyebrow="Priority Queue"
          description="Latest organization-level alerts relevant to specialist triage."
          className="h-full"
        >
          <div className="space-y-3">
            {alerts.length === 0 && !openAlerts.isLoading ? (
              <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                No open alerts at the moment.
              </p>
            ) : null}
            {alerts.map((alert) => (
              <div key={alert.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{alert.title || "Clinical alert"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Patient: {alert.patientId}</p>
                    <p className="text-xs text-muted-foreground">
                      {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : "Unknown time"}
                    </p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyle(alert.priority)}`}>
                    {alert.priority || "OPEN"}
                  </span>
                </div>
              </div>
            ))}
            {openAlerts.isLoading ? <p className="text-sm text-muted-foreground">Loading alerts...</p> : null}
            {openAlerts.isError ? <p className="text-sm text-secondary">Unable to load alerts.</p> : null}
          </div>
        </Panel>

        <Panel
          title="Recent Specialist Patients"
          eyebrow="Caseload Recency"
          description="Most recently updated records in your specialist queue."
          className="h-full"
        >
          <div className="space-y-3">
            {recentPatients.length === 0 && !caseload.isLoading ? (
              <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                No assigned specialist patients yet.
              </p>
            ) : null}
            {recentPatients.map((patient) => (
              <div key={patient.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
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
                  <span className="inline-flex rounded-full border border-primary/20 bg-primary/[0.1] px-3 py-1 text-xs font-medium text-primary">
                    Stage {patient.lifecycleStage}
                  </span>
                </div>
              </div>
            ))}
            {caseload.isLoading ? <p className="text-sm text-muted-foreground">Loading caseload...</p> : null}
            {caseload.isError ? <p className="text-sm text-secondary">Unable to load specialist caseload.</p> : null}
          </div>
        </Panel>
      </div>

      <Panel
        title="Specialist Action Focus"
        eyebrow="Execution Notes"
        description="Prioritize high-stage patients first, then clear overdue referrals and escalated orders."
        className="mt-4"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Step 1</p>
            <p className="mt-2 font-medium text-foreground">Review critical alerts</p>
            <p className="mt-2 text-sm text-muted-foreground">Start with alert feed and acknowledge/resolution actions in caseload view.</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Step 2</p>
            <p className="mt-2 font-medium text-foreground">Update referral and order statuses</p>
            <p className="mt-2 text-sm text-muted-foreground">Move stuck items from CREATED/ACTIVE into IN_PROGRESS or COMPLETED with notes.</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Step 3</p>
            <p className="mt-2 font-medium text-foreground">Log specialist clinical events</p>
            <p className="mt-2 text-sm text-muted-foreground">Capture specialist observations and raise alerts only when clinically necessary.</p>
          </div>
        </div>
      </Panel>
    </PortalShell>
  );
}
