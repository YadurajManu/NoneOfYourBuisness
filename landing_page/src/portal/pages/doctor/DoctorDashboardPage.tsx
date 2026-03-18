import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Clock3,
  FileText,
  ShieldAlert,
  Stethoscope,
  Users2,
} from "lucide-react";
import { getDashboardOverview } from "@/lib/api/client";
import { PortalShell } from "@/portal/portal-shell";
import { Panel } from "@/portal/panel";

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

  const full = [primary.given?.join(" "), primary.family].filter(Boolean).join(" ").trim();
  return full.length > 0 ? full : `Patient ${fallbackId.slice(0, 8)}`;
}

export default function DoctorDashboardPage() {
  const overview = useQuery({ queryKey: ["doctor", "overview"], queryFn: getDashboardOverview });

  const typed = (overview.data || {}) as {
    totals?: Record<string, unknown>;
    lifecycleBreakdown?: Array<{ stage: number; count: number }>;
    recentPatients?: Array<{ id: string; lifecycleStage: number; updatedAt: string; fhirResource?: unknown }>;
  };

  const totals = typed.totals || {};
  const metricCards = [
    {
      label: "Active Patients",
      value: toNumber(totals.patients),
      hint: "Total patients in organization scope",
      icon: Users2,
    },
    {
      label: "Open Clinical Alerts",
      value: toNumber(totals.openClinicalAlerts),
      hint: "Needs doctor review",
      icon: ShieldAlert,
    },
    {
      label: "Pending Clinical Orders",
      value: toNumber(totals.pendingClinicalOrders),
      hint: "Orders in active workflow",
      icon: Stethoscope,
    },
    {
      label: "Overdue Care Tasks",
      value: toNumber(totals.overdueCareTasks),
      hint: "Escalation candidates",
      icon: Clock3,
    },
    {
      label: "Pending Prior Auth",
      value: toNumber(totals.pendingPriorAuthorizations),
      hint: "Insurance coordination backlog",
      icon: AlertTriangle,
    },
    {
      label: "Documents",
      value: toNumber(totals.documents),
      hint: "Processed and in-flight documents",
      icon: FileText,
    },
  ];

  const lifecycle = (typed.lifecycleBreakdown || [])
    .map((row) => ({ stage: Number(row.stage), count: Number(row.count) }))
    .filter((row) => Number.isFinite(row.stage) && Number.isFinite(row.count));

  const maxLifecycleCount = Math.max(...lifecycle.map((row) => row.count), 1);
  const recentPatients = typed.recentPatients || [];

  return (
    <PortalShell title="Doctor Dashboard">
      <Panel
        title="Clinical Operations Pulse"
        eyebrow="Doctor View"
        description="Prioritize patient flow, alerts, and treatment operations from one focused command surface."
        action={
          <Link
            to="/portal/doctor/caseload"
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
          >
            Open Caseload
            <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
          </Link>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {metricCards.map((metric) => (
            <div
              key={metric.label}
              className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{metric.label}</p>
                  <p className="mt-3 font-display text-4xl font-bold tracking-[-0.05em] text-foreground">
                    {metric.value}
                  </p>
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

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel
          title="Lifecycle Distribution"
          eyebrow="10-Stage Pipeline"
          description="Current patient volume across lifecycle stages."
          className="h-full"
        >
          <div className="space-y-3">
            {lifecycle.length === 0 ? (
              <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                No lifecycle data available yet.
              </p>
            ) : (
              lifecycle.map((row) => (
                <div key={row.stage} className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">Stage {row.stage}</p>
                    <p className="text-xs text-muted-foreground">{row.count} patients</p>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-primary/70 to-primary"
                      style={{ width: `${Math.max(6, (row.count / maxLifecycleCount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel
          title="Recently Updated Patients"
          eyebrow="Timeline Priority"
          description="Use this queue to jump into the most recently changing patient records."
          className="h-full"
        >
          <div className="space-y-3">
            {recentPatients.length === 0 ? (
              <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                No recent patient activity.
              </p>
            ) : (
              recentPatients.slice(0, 8).map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {getPatientName(patient.fhirResource, patient.id)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Stage {patient.lifecycleStage} • {new Date(patient.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <Activity className="h-4 w-4" strokeWidth={1.8} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      {overview.isLoading ? <p className="mt-4 text-muted-foreground">Loading dashboard...</p> : null}
      {overview.isError ? <p className="mt-4 text-secondary">Unable to load doctor dashboard.</p> : null}
    </PortalShell>
  );
}
