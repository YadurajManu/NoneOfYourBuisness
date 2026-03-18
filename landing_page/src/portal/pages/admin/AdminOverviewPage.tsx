import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ClipboardCheck,
  FileText,
  HeartPulse,
  ShieldAlert,
  UserRound,
  Users2,
} from "lucide-react";
import { getDashboardOverview } from "@/lib/api/client";
import { PortalShell } from "@/portal/portal-shell";
import { Panel } from "@/portal/panel";

type BreakdownItem = {
  status?: string;
  stage?: number;
  count: number;
};

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function metricLabel(label: string) {
  return label.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
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

function maxCount(items: BreakdownItem[]) {
  return Math.max(...items.map((item) => item.count), 1);
}

export default function AdminOverviewPage() {
  const overview = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: getDashboardOverview,
  });

  const typed = (overview.data || {}) as {
    totals?: Record<string, unknown>;
    lifecycleBreakdown?: BreakdownItem[];
    alertStatusBreakdown?: BreakdownItem[];
    orderStatusBreakdown?: BreakdownItem[];
    referralStatusBreakdown?: BreakdownItem[];
    recentPatients?: Array<{ id: string; lifecycleStage: number; updatedAt: string; fhirResource?: unknown }>;
  };

  const totals = typed.totals || {};
  const metricCards = [
    {
      key: "patients",
      label: "Patients",
      icon: Users2,
      hint: "Total patients in organization",
    },
    {
      key: "documents",
      label: "Documents",
      icon: FileText,
      hint: "Clinical files in system",
    },
    {
      key: "openClinicalAlerts",
      label: "Open Alerts",
      icon: ShieldAlert,
      hint: "Needs immediate attention",
    },
    {
      key: "pendingClinicalOrders",
      label: "Pending Orders",
      icon: ClipboardCheck,
      hint: "Orders in active queue",
    },
    {
      key: "overdueCareTasks",
      label: "Overdue Tasks",
      icon: AlertTriangle,
      hint: "Escalation risk",
    },
    {
      key: "activeReferrals",
      label: "Active Referrals",
      icon: Activity,
      hint: "Cross-team handoffs in progress",
    },
  ];

  const lifecycle = useMemo(
    () =>
      (typed.lifecycleBreakdown || [])
        .map((item) => ({
          stage: Number(item.stage),
          count: Number(item.count),
        }))
        .filter((item) => Number.isFinite(item.stage) && Number.isFinite(item.count)),
    [typed.lifecycleBreakdown],
  );

  const alertBreakdown = useMemo(
    () =>
      (typed.alertStatusBreakdown || [])
        .map((item) => ({ status: String(item.status || "UNKNOWN"), count: Number(item.count) }))
        .filter((item) => Number.isFinite(item.count)),
    [typed.alertStatusBreakdown],
  );

  const orderBreakdown = useMemo(
    () =>
      (typed.orderStatusBreakdown || [])
        .map((item) => ({ status: String(item.status || "UNKNOWN"), count: Number(item.count) }))
        .filter((item) => Number.isFinite(item.count)),
    [typed.orderStatusBreakdown],
  );

  const referralBreakdown = useMemo(
    () =>
      (typed.referralStatusBreakdown || [])
        .map((item) => ({ status: String(item.status || "UNKNOWN"), count: Number(item.count) }))
        .filter((item) => Number.isFinite(item.count)),
    [typed.referralStatusBreakdown],
  );

  const recentPatients = typed.recentPatients || [];

  return (
    <PortalShell title="Admin Overview">
      <Panel
        title="Operations Health Snapshot"
        eyebrow="Executive View"
        description="Monitor patient throughput, clinical workload, and escalation risk across your organization."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {metricCards.map((metric) => (
            <div
              key={metric.key}
              className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{metric.label}</p>
                  <p className="mt-3 font-display text-4xl font-bold tracking-[-0.05em] text-foreground">
                    {toNumber(totals[metric.key])}
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

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel
          title="Lifecycle and Workflow Distribution"
          eyebrow="Pipeline Shape"
          description="See where patient volume and workflow states are concentrating."
          className="h-full"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <HeartPulse className="h-4 w-4 text-primary" strokeWidth={1.8} />
                Lifecycle
              </p>
              <div className="space-y-2">
                {lifecycle.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No lifecycle data yet.</p>
                ) : (
                  lifecycle.map((item) => (
                    <div key={item.stage}>
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Stage {item.stage}</span>
                        <span>{item.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-primary/70 to-primary"
                          style={{ width: `${Math.max(6, (item.count / maxCount(lifecycle)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <BarChart3 className="h-4 w-4 text-primary" strokeWidth={1.8} />
                Alerts
              </p>
              <div className="space-y-2">
                {alertBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No alert data yet.</p>
                ) : (
                  alertBreakdown.map((item) => (
                    <div key={item.status} className="flex items-center justify-between rounded-xl border border-white/8 bg-background/40 px-3 py-2 text-sm">
                      <span className="text-foreground/90">{metricLabel(item.status)}</span>
                      <span className="font-semibold text-primary">{item.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">Orders</p>
              <div className="space-y-2">
                {orderBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No order data yet.</p>
                ) : (
                  orderBreakdown.map((item) => (
                    <div key={item.status} className="flex items-center justify-between rounded-xl border border-white/8 bg-background/40 px-3 py-2 text-sm">
                      <span className="text-foreground/90">{metricLabel(item.status)}</span>
                      <span className="font-semibold text-primary">{item.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">Referrals</p>
              <div className="space-y-2">
                {referralBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No referral data yet.</p>
                ) : (
                  referralBreakdown.map((item) => (
                    <div key={item.status} className="flex items-center justify-between rounded-xl border border-white/8 bg-background/40 px-3 py-2 text-sm">
                      <span className="text-foreground/90">{metricLabel(item.status)}</span>
                      <span className="font-semibold text-primary">{item.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          title="Recently Updated Patients"
          eyebrow="Recency Queue"
          description="Quick visibility into records with the latest operational changes."
          className="h-full"
        >
          <div className="space-y-3">
            {recentPatients.length === 0 ? (
              <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                No recent patient updates available.
              </p>
            ) : (
              recentPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"
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
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      Stage {patient.lifecycleStage}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      {overview.isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading overview...</p>
      ) : null}
      {overview.isError ? (
        <p className="mt-4 text-sm text-secondary">Unable to load dashboard overview.</p>
      ) : null}
    </PortalShell>
  );
}
