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
    <p className="rounded-2xl border border-white/8 bg-white/[0.02] px-3 py-2.5 text-sm text-muted-foreground">
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
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
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

function CompactQueue({
  title,
  eyebrow,
  items,
  emptyLabel,
  renderMeta,
}: {
  title: string;
  eyebrow: string;
  items: OverviewItem[];
  emptyLabel: string;
  renderMeta: (item: OverviewItem) => string;
}) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-white/[0.025] p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-primary/70">{eyebrow}</p>
          <p className="mt-1 text-base font-semibold text-foreground">{title}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-foreground">
          {items.length}
        </span>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <EmptyState label={emptyLabel} />
        ) : (
          items.slice(0, 4).map((item) => (
            <QueueRow key={String(item.id)} item={item} meta={renderMeta(item)} />
          ))
        )}
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
      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[0.72fr_1.28fr]">
        <Panel
          title="Operations Snapshot"
          eyebrow="Live Health"
          description="The smallest set of numbers admins need before choosing an action."
          className="h-full"
        >
          <div className="grid grid-cols-2 gap-2">
            {healthCards.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{metric.label}</p>
                  <metric.icon className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.8} />
                </div>
                <p className="mt-2 font-display text-3xl font-bold tracking-[-0.05em] text-foreground">
                  {metric.value}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{metric.hint}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Priority Actions"
          eyebrow="Admin Queue"
          description="Compact action list sorted around what blocks operations."
          className="h-full"
        >
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 2xl:grid-cols-3">
            {priorityActions.map((action) => {
              const row = asRecord(action);
              const route = String(row.route || "/portal/admin/patients");
              const severity = String(row.severity || "NORMAL");
              return (
                <Link
                  key={String(row.key || row.label)}
                  to={route}
                  className={`rounded-2xl border px-3 py-2.5 transition-transform hover:-translate-y-0.5 ${severityClass(severity)}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.16em] opacity-75">{formatLabel(severity)}</p>
                      <p className="mt-1 truncate text-sm font-semibold text-foreground">{String(row.label || "Action")}</p>
                    </div>
                    <p className="font-display text-3xl font-bold tracking-[-0.05em]">{toNumber(row.count)}</p>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{String(row.description || "")}</p>
                  <span className="mt-2 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]">
                    Open queue <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </span>
                </Link>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Panel
          title="Risk and Exception Board"
          eyebrow="Queues"
          description="Four admin queues in one view. Each card shows the top active items only."
        >
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <CompactQueue
              title="Care Team Gaps"
              eyebrow="Ownership"
              items={asArray(riskQueues.unassignedPatients)}
              emptyLabel="No care-team assignment gaps."
              renderMeta={(item) => {
                const row = asRecord(item);
                const missing = [
                  row.missingPrimaryDoctor ? "primary doctor" : null,
                  row.missingSpecialist ? "specialist" : null,
                ].filter(Boolean);
                return `Missing ${missing.join(" and ")} · ${dateLabel(row.updatedAt)}`;
              }}
            />
            <CompactQueue
              title="Clinical Risk"
              eyebrow="Open Alerts"
              items={asArray(riskQueues.urgentAlerts)}
              emptyLabel="No open clinical alerts."
              renderMeta={(item) => {
                const row = asRecord(item);
                return `${String(row.priority || "MEDIUM")} · ${String(row.title || "Clinical alert")} · ${dateLabel(row.createdAt)}`;
              }}
            />
            <CompactQueue
              title="Overdue Work"
              eyebrow="SLA Risk"
              items={[...asArray(riskQueues.overdueTasks), ...asArray(riskQueues.overdueReferrals)]}
              emptyLabel="No overdue work found."
              renderMeta={(item) => {
                const row = asRecord(item);
                const assignee = asRecord(row.assignedToUser);
                return `${String(row.title || row.destinationName || "Work item")} · Due ${dateLabel(row.dueAt)} · ${String(assignee.displayName || assignee.email || "Unassigned")}`;
              }}
            />
            <div className="rounded-[22px] border border-white/8 bg-white/[0.025] p-3">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-primary/70">Cleanup</p>
                  <p className="mt-1 text-base font-semibold text-foreground">Docs and Support</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-foreground">
                  {asArray(riskQueues.failedDocuments).length + asArray(riskQueues.openSupportTickets).length}
                </span>
              </div>
              <div className="space-y-2">
                {asArray(riskQueues.failedDocuments).slice(0, 2).map((item) => {
                  const row = asRecord(item);
                  return (
                    <QueueRow
                      key={`document-${String(row.id)}`}
                      item={row}
                      meta={`Failed document · ${String(row.type || "Clinical document")} · ${dateLabel(row.updatedAt)}`}
                    />
                  );
                })}
                {asArray(riskQueues.openSupportTickets).slice(0, 2).map((item) => {
                  const row = asRecord(item);
                  return (
                    <div key={`ticket-${String(row.id)}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{String(row.subject || "Support ticket")}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatLabel(String(row.category || "OTHER"))} · {formatLabel(String(row.priority || "NORMAL"))}
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
            </div>
          </div>
        </Panel>

        <Panel
          title="Staff Workload"
          eyebrow="Load Balance"
          description="Open tasks, orders, and referrals by staff member."
          className="h-full"
        >
          <div className="space-y-2">
            {staffWorkload.length === 0 ? (
              <EmptyState label="No staff workload data yet." />
            ) : (
              staffWorkload.slice(0, 6).map((item) => {
                const row = asRecord(item);
                return (
                  <div key={String(row.id)} className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
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
                    <div className="mt-2 grid grid-cols-3 gap-1.5 text-center text-[11px] text-muted-foreground">
                      <span className="rounded-xl bg-background/50 px-2 py-1.5">Tasks {toNumber(row.activeTasks)}</span>
                      <span className="rounded-xl bg-background/50 px-2 py-1.5">Orders {toNumber(row.activeOrders)}</span>
                      <span className="rounded-xl bg-background/50 px-2 py-1.5">Refs {toNumber(row.activeReferrals)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Panel>
      </div>

      <div className="mt-4">
        <Panel
          title="Lifecycle Shape"
          eyebrow="Pipeline"
          description="Patient distribution by lifecycle stage and latest records with operational movement."
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
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

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
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
