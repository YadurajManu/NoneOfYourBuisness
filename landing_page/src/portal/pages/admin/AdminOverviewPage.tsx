import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  FileWarning,
  HeartPulse,
  LifeBuoy,
  ShieldAlert,
  UserCheck,
  Users2,
} from "lucide-react";
import { getDashboardOverview } from "@/lib/api/client";
import { PortalShell } from "@/portal/portal-shell";
import { Panel } from "@/portal/panel";

type OverviewItem = Record<string, unknown>;
type BreakdownItem = { status?: string; stage?: number; count: number };

function asArray<T = OverviewItem>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asRecord(value: unknown): OverviewItem {
  return value && typeof value === "object" ? (value as OverviewItem) : {};
}

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatLabel(label: string) {
  return label.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function getPatientName(resource: unknown, fallbackId: string) {
  const typed = asRecord(resource);
  const names = asArray(typed.name).map(asRecord);
  const primary = names[0];
  const text = primary?.text ? String(primary.text).trim() : "";
  if (text) return text;

  const given = asArray<string>(primary?.given).join(" ");
  const family = primary?.family ? String(primary.family) : "";
  const fullName = [given, family].filter(Boolean).join(" ").trim();
  return fullName || `Patient ${fallbackId.slice(0, 8)}`;
}

function patientNameFromItem(item: OverviewItem) {
  const patient = asRecord(item.patient);
  return getPatientName(patient.fhirResource || item.fhirResource, String(patient.id || item.id || ""));
}

function dateLabel(value: unknown) {
  if (!value) return "No date";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleString();
}

function severityClass(severity: string) {
  if (severity === "URGENT") return "border-red-400/30 bg-red-400/[0.08] text-red-50";
  if (severity === "HIGH") return "border-amber-300/30 bg-amber-300/[0.08] text-amber-50";
  if (severity === "MEDIUM") return "border-primary/25 bg-primary/[0.07] text-primary";
  return "border-white/8 bg-white/[0.03] text-foreground";
}

function maxCount(items: BreakdownItem[]) {
  return Math.max(...items.map((item) => item.count), 1);
}

function EmptyState({ label }: { label: string }) {
  return (
    <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
      {label}
    </p>
  );
}

function PatientLink({ item }: { item: OverviewItem }) {
  const patient = asRecord(item.patient);
  const patientId = String(patient.id || item.patientId || item.id || "");
  if (!patientId) {
    return <span>{patientNameFromItem(item)}</span>;
  }

  return (
    <Link to={`/portal/patient-profile/${patientId}`} className="transition-colors hover:text-primary">
      {patientNameFromItem(item)}
    </Link>
  );
}

function QueueRow({
  item,
  meta,
}: {
  item: OverviewItem;
  meta: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            <PatientLink item={item} />
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
        </div>
        <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          Stage {toNumber(asRecord(item.patient).lifecycleStage || item.lifecycleStage)}
        </span>
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const overview = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: getDashboardOverview,
    refetchInterval: 15000,
  });

  const typed = asRecord(overview.data);
  const totals = asRecord(typed.totals);
  const riskQueues = asRecord(typed.riskQueues);
  const priorityActions = asArray(typed.priorityActions);
  const staffWorkload = asArray(typed.staffWorkload);
  const recentPatients = asArray(typed.recentPatients);

  const lifecycle = useMemo(
    () =>
      asArray<BreakdownItem>(typed.lifecycleBreakdown)
        .map((item) => ({
          stage: Number(item.stage),
          count: Number(item.count),
        }))
        .filter((item) => Number.isFinite(item.stage) && Number.isFinite(item.count)),
    [typed.lifecycleBreakdown],
  );

  const healthCards = [
    {
      label: "Total Patients",
      value: toNumber(totals.patients),
      hint: "Records under active organization control",
      icon: Users2,
    },
    {
      label: "Open Alerts",
      value: toNumber(totals.openClinicalAlerts),
      hint: "Clinical risks not yet resolved",
      icon: ShieldAlert,
    },
    {
      label: "Overdue Tasks",
      value: toNumber(totals.overdueCareTasks),
      hint: "Care tasks past due",
      icon: AlertTriangle,
    },
    {
      label: "Active Referrals",
      value: toNumber(totals.activeReferrals),
      hint: "Cross-team handoffs in motion",
      icon: HeartPulse,
    },
  ];

  return (
    <PortalShell title="Admin Overview">
      <Panel
        title="Operations Command Center"
        eyebrow="What Needs Action Now"
        description="Admin dashboard is organized around bottlenecks, ownership gaps, escalations, and workload balance."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {healthCards.map((metric) => (
            <div key={metric.label} className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{metric.label}</p>
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
          title="Priority Actions"
          eyebrow="Admin Queue"
          description="Start here. These cards are sorted around what blocks operations."
          className="h-full"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {priorityActions.map((action) => {
              const row = asRecord(action);
              const route = String(row.route || "/portal/admin/patients");
              const severity = String(row.severity || "NORMAL");
              return (
                <Link
                  key={String(row.key || row.label)}
                  to={route}
                  className={`rounded-2xl border p-4 transition-transform hover:-translate-y-0.5 ${severityClass(severity)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] opacity-75">{formatLabel(severity)}</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{String(row.label || "Action")}</p>
                    </div>
                    <p className="font-display text-4xl font-bold tracking-[-0.05em]">{toNumber(row.count)}</p>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{String(row.description || "")}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
                    Open queue <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </span>
                </Link>
              );
            })}
          </div>
        </Panel>

        <Panel
          title="Care Team Assignment Gaps"
          eyebrow="Ownership"
          description="Patients missing a primary doctor or specialist should be assigned before workflow volume grows."
          className="h-full"
        >
          <div className="space-y-3">
            {asArray(riskQueues.unassignedPatients).length === 0 ? (
              <EmptyState label="No care-team assignment gaps found." />
            ) : (
              asArray(riskQueues.unassignedPatients).map((item) => {
                const row = asRecord(item);
                const missing = [
                  row.missingPrimaryDoctor ? "primary doctor" : null,
                  row.missingSpecialist ? "specialist" : null,
                ].filter(Boolean);
                return (
                  <QueueRow
                    key={String(row.id)}
                    item={row}
                    meta={`Missing ${missing.join(" and ")} · Updated ${dateLabel(row.updatedAt)}`}
                  />
                );
              })
            )}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel
          title="Clinical Risk"
          eyebrow="Open Alerts"
          description="Open alerts that need clinical attention or admin escalation."
        >
          <div className="space-y-3">
            {asArray(riskQueues.urgentAlerts).length === 0 ? (
              <EmptyState label="No open clinical alerts." />
            ) : (
              asArray(riskQueues.urgentAlerts).map((item) => {
                const row = asRecord(item);
                return (
                  <QueueRow
                    key={String(row.id)}
                    item={row}
                    meta={`${String(row.priority || "MEDIUM")} · ${String(row.title || "Clinical alert")} · ${dateLabel(row.createdAt)}`}
                  />
                );
              })
            )}
          </div>
        </Panel>

        <Panel
          title="Overdue Work"
          eyebrow="SLA Risk"
          description="Care tasks and referrals past due should be reassigned or escalated."
        >
          <div className="space-y-3">
            {[...asArray(riskQueues.overdueTasks), ...asArray(riskQueues.overdueReferrals)].length === 0 ? (
              <EmptyState label="No overdue work found." />
            ) : (
              [...asArray(riskQueues.overdueTasks), ...asArray(riskQueues.overdueReferrals)].slice(0, 8).map((item) => {
                const row = asRecord(item);
                const assignee = asRecord(row.assignedToUser);
                return (
                  <QueueRow
                    key={String(row.id)}
                    item={row}
                    meta={`${String(row.title || row.destinationName || "Work item")} · Due ${dateLabel(row.dueAt)} · ${String(assignee.displayName || assignee.email || "Unassigned")}`}
                  />
                );
              })
            )}
          </div>
        </Panel>

        <Panel
          title="Document and Support Exceptions"
          eyebrow="Operational Cleanup"
          description="Failures and tickets that need an admin owner."
        >
          <div className="space-y-3">
            {asArray(riskQueues.failedDocuments).slice(0, 3).map((item) => {
              const row = asRecord(item);
              return (
                <QueueRow
                  key={`document-${String(row.id)}`}
                  item={row}
                  meta={`Failed document · ${String(row.type || "Clinical document")} · ${dateLabel(row.updatedAt)}`}
                />
              );
            })}
            {asArray(riskQueues.openSupportTickets).slice(0, 5).map((item) => {
              const row = asRecord(item);
              return (
                <div key={`ticket-${String(row.id)}`} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{String(row.subject || "Support ticket")}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatLabel(String(row.category || "OTHER"))} · {formatLabel(String(row.priority || "NORMAL"))} · {formatLabel(String(row.status || "OPEN"))}
                      </p>
                    </div>
                    <LifeBuoy className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.8} />
                  </div>
                </div>
              );
            })}
            {asArray(riskQueues.failedDocuments).length === 0 && asArray(riskQueues.openSupportTickets).length === 0 ? (
              <EmptyState label="No failed documents or open support tickets." />
            ) : null}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel
          title="Staff Workload"
          eyebrow="Load Balance"
          description="Open tasks, orders, and referrals by staff member."
        >
          <div className="space-y-3">
            {staffWorkload.length === 0 ? (
              <EmptyState label="No staff workload data yet." />
            ) : (
              staffWorkload.map((item) => {
                const row = asRecord(item);
                return (
                  <div key={String(row.id)} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {String(row.displayName || row.email || "Staff user")}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatLabel(String(row.role || "STAFF"))}</p>
                      </div>
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                        {toNumber(row.totalOpenWork)}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
                      <span className="rounded-xl bg-background/50 px-2 py-2">Tasks {toNumber(row.activeTasks)}</span>
                      <span className="rounded-xl bg-background/50 px-2 py-2">Orders {toNumber(row.activeOrders)}</span>
                      <span className="rounded-xl bg-background/50 px-2 py-2">Referrals {toNumber(row.activeReferrals)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Panel>

        <Panel
          title="Lifecycle Shape"
          eyebrow="Pipeline"
          description="Patient distribution by lifecycle stage and latest records with operational movement."
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <ClipboardCheck className="h-4 w-4 text-primary" strokeWidth={1.8} />
                Stage Distribution
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

            <div className="space-y-3">
              {recentPatients.slice(0, 5).map((item) => {
                const row = asRecord(item);
                return (
                  <QueueRow
                    key={String(row.id)}
                    item={row}
                    meta={`Recently updated · ${dateLabel(row.updatedAt)}`}
                  />
                );
              })}
              {recentPatients.length === 0 ? <EmptyState label="No recent patient updates available." /> : null}
            </div>
          </div>
        </Panel>
      </div>

      {overview.isLoading ? <p className="mt-4 text-sm text-muted-foreground">Loading admin command center...</p> : null}
      {overview.isError ? <p className="mt-4 text-sm text-secondary">Unable to load admin dashboard.</p> : null}
    </PortalShell>
  );
}
