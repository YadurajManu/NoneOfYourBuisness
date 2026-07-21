import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Download,
  FileWarning,
  HeartPulse,
  LifeBuoy,
  Loader2,
  Printer,
  RefreshCw,
  ShieldAlert,
  UserPlus2,
  UserRound,
  Users2,
} from "lucide-react";
import { getAdminAuditEvents, getDashboardOverview } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { PortalShell } from "@/portal/portal-shell";
import { Panel } from "@/portal/panel";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type OverviewItem = Record<string, unknown>;
type BreakdownItem = { status?: string; stage?: number; count: number };
type TimeFilter = "all" | "today";

type PriorityAction = {
  key: string;
  label: string;
  shortLabel: string;
  count: number;
  severity: "URGENT" | "HIGH" | "MEDIUM" | "NORMAL" | "CLEAR";
  description: string;
  route: string;
  icon: typeof Users2;
};

type ActivityItem = {
  id: string;
  at: Date;
  kind: string;
  title: string;
  detail: string;
};

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
  return label.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
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
  return getPatientName(
    patient.fhirResource || item.fhirResource,
    String(patient.id || item.id || ""),
  );
}

function dateLabel(value: unknown) {
  if (!value) return "No date";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isToday(value: unknown) {
  if (!value) return false;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function severityRank(severity: string) {
  if (severity === "URGENT") return 0;
  if (severity === "HIGH") return 1;
  if (severity === "MEDIUM") return 2;
  if (severity === "NORMAL") return 3;
  return 4;
}

function severityStyles(severity: string) {
  if (severity === "URGENT") {
    return "border-red-400/35 bg-red-400/[0.1] text-red-50";
  }
  if (severity === "HIGH") {
    return "border-amber-300/35 bg-amber-300/[0.1] text-amber-50";
  }
  if (severity === "MEDIUM") {
    return "border-primary/30 bg-primary/[0.08] text-primary";
  }
  if (severity === "CLEAR") {
    return "border-white/8 bg-white/[0.02] text-muted-foreground";
  }
  return "border-white/8 bg-white/[0.03] text-foreground";
}

function maxCount(items: BreakdownItem[]) {
  return Math.max(...items.map((item) => item.count), 1);
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-xl bg-white/[0.06]", className)} />
  );
}

function PatientLink({ item }: { item: OverviewItem }) {
  const patient = asRecord(item.patient);
  const patientId = String(patient.id || item.patientId || item.id || "");
  if (!patientId) {
    return <span>{patientNameFromItem(item)}</span>;
  }

  return (
    <Link
      to={`/portal/patient-profile/${patientId}`}
      className="transition-colors hover:text-primary"
    >
      {patientNameFromItem(item)}
    </Link>
  );
}

function DenseRow({
  primary,
  meta,
  badge,
}: {
  primary: ReactNode;
  meta: string;
  badge?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/[0.05] px-2.5 py-2 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-foreground">{primary}</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{meta}</p>
      </div>
      {badge}
    </div>
  );
}

function QueueBlock({
  title,
  count,
  href,
  emptyLabel,
  children,
}: {
  title: string;
  count: number;
  href: string;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02]">
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.05] px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
              count > 0
                ? "border border-primary/25 bg-primary/10 text-primary"
                : "border border-white/10 bg-white/[0.03] text-muted-foreground",
            )}
          >
            {count}
          </span>
        </div>
        <Link
          to={href}
          className="shrink-0 text-[11px] font-medium text-primary transition-colors hover:text-primary/80"
        >
          Open
        </Link>
      </div>
      <div className="min-h-[4.5rem]">
        {count === 0 ? (
          <p className="px-3 py-3 text-[12px] text-muted-foreground">{emptyLabel}</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const navigate = useNavigate();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const overview = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: getDashboardOverview,
    refetchInterval: 30_000,
  });

  const audit = useQuery({
    queryKey: ["admin", "audit-events"],
    queryFn: getAdminAuditEvents,
    refetchInterval: 45_000,
  });

  useEffect(() => {
    if (overview.dataUpdatedAt) {
      setLastUpdated(new Date(overview.dataUpdatedAt));
    }
  }, [overview.dataUpdatedAt]);

  const typed = asRecord(overview.data);
  const totals = asRecord(typed.totals);
  const riskQueues = asRecord(typed.riskQueues);
  const staffWorkload = asArray(typed.staffWorkload);
  const recentPatients = asArray(typed.recentPatients);
  const apiPriority = asArray(typed.priorityActions);

  const patientCount = toNumber(totals.patients);
  const openAlerts = toNumber(totals.openClinicalAlerts);
  const overdueTasks = toNumber(totals.overdueCareTasks);
  const activeReferrals = toNumber(totals.activeReferrals);
  const overdueReferrals = toNumber(totals.overdueReferrals);
  const pendingOrders = toNumber(totals.pendingClinicalOrders);

  const unassignedPatients = asArray(riskQueues.unassignedPatients);
  const urgentAlerts = asArray(riskQueues.urgentAlerts);
  const overdueTaskItems = asArray(riskQueues.overdueTasks);
  const overdueReferralItems = asArray(riskQueues.overdueReferrals);
  const failedDocuments = asArray(riskQueues.failedDocuments);
  const pendingFamilyInvites = asArray(riskQueues.pendingFamilyInvites);
  const openSupportTickets = asArray(riskQueues.openSupportTickets);

  const iconByKey: Record<string, typeof Users2> = {
    "assign-care-team": UserRound,
    "open-alerts": ShieldAlert,
    "overdue-work": AlertTriangle,
    "failed-documents": FileWarning,
    "support-tickets": LifeBuoy,
    "family-consent": HeartPulse,
  };

  const shortLabelByKey: Record<string, string> = {
    "assign-care-team": "Care teams",
    "open-alerts": "Open alerts",
    "overdue-work": "Overdue work",
    "failed-documents": "Failed docs",
    "support-tickets": "Support",
    "family-consent": "Family consent",
  };

  const priorityActions: PriorityAction[] = useMemo(() => {
    const fromApi = apiPriority.map((raw) => {
      const row = asRecord(raw);
      const key = String(row.key || row.label || "action");
      const count = toNumber(row.count);
      const severityRaw = String(row.severity || "NORMAL").toUpperCase();
      const severity =
        count === 0
          ? ("CLEAR" as const)
          : severityRaw === "URGENT" ||
              severityRaw === "HIGH" ||
              severityRaw === "MEDIUM"
            ? (severityRaw as PriorityAction["severity"])
            : ("NORMAL" as const);

      return {
        key,
        label: String(row.label || "Action"),
        shortLabel: shortLabelByKey[key] || String(row.label || "Action"),
        count,
        severity,
        description: String(row.description || ""),
        route: String(row.route || "/portal/admin/patients"),
        icon: iconByKey[key] || ClipboardList,
      };
    });

    return fromApi.sort((a, b) => {
      if (a.count === 0 && b.count > 0) return 1;
      if (b.count === 0 && a.count > 0) return -1;
      return severityRank(a.severity) - severityRank(b.severity) || b.count - a.count;
    });
  }, [apiPriority]);

  const activePriority = priorityActions.filter((a) => a.count > 0);
  const primaryAction = activePriority[0] ?? null;
  const openItemCount = activePriority.reduce((sum, a) => sum + a.count, 0);

  const staffWithWork = staffWorkload.filter(
    (row) => toNumber(asRecord(row).totalOpenWork) > 0,
  );

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

  const activityItems: ActivityItem[] = useMemo(() => {
    const data = audit.data;
    if (!data) return [];

    const family = asArray(data.familyAccessAudits).map((row) => {
      const r = asRecord(row);
      return {
        id: `fam-${String(r.id)}`,
        at: new Date(String(r.createdAt || 0)),
        kind: "Family access",
        title: formatLabel(String(r.action || "ACCESS_EVENT")),
        detail: `Patient ${String(r.patientId || "").slice(0, 8)}…`,
      };
    });

    const workflow = asArray(data.workflowAudits).map((row) => {
      const r = asRecord(row);
      return {
        id: `wf-${String(r.id)}`,
        at: new Date(String(r.createdAt || 0)),
        kind: "Workflow",
        title: formatLabel(String(r.action || r.entityType || "WORKFLOW")),
        detail: String(r.entityType || r.notes || "Workflow event"),
      };
    });

    const lifecycleEvents = asArray(data.lifecycleTransitions).map((row) => {
      const r = asRecord(row);
      return {
        id: `lc-${String(r.id)}`,
        at: new Date(String(r.createdAt || 0)),
        kind: "Lifecycle",
        title: `Stage ${String(r.fromStage ?? "?")} → ${String(r.toStage ?? "?")}`,
        detail: `Patient ${String(r.patientId || "").slice(0, 8)}…`,
      };
    });

    return [...family, ...workflow, ...lifecycleEvents]
      .filter((item) => !Number.isNaN(item.at.getTime()))
      .sort((a, b) => b.at.getTime() - a.at.getTime());
  }, [audit.data]);

  const filteredActivity = useMemo(() => {
    const list =
      timeFilter === "today" ? activityItems.filter((a) => isToday(a.at)) : activityItems;
    return list.slice(0, 10);
  }, [activityItems, timeFilter]);

  const filteredRecentPatients = useMemo(() => {
    if (timeFilter === "today") {
      return recentPatients.filter((row) => isToday(asRecord(row).updatedAt));
    }
    return recentPatients;
  }, [recentPatients, timeFilter]);

  const isNewOrg = !overview.isLoading && patientCount === 0;
  const isLoading = overview.isLoading && !overview.data;
  const isError = overview.isError;

  const relativeUpdated = useMemo(() => {
    if (!lastUpdated) return "—";
    const seconds = Math.max(0, Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    if (seconds < 10) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return lastUpdated.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [lastUpdated, overview.dataUpdatedAt]);

  const refreshAll = useCallback(() => {
    void overview.refetch();
    void audit.refetch();
  }, [overview, audit]);

  const exportSummary = useCallback(() => {
    const lines = [
      "Aarogya360 Operations Summary",
      `Generated: ${new Date().toLocaleString()}`,
      `Time filter: ${timeFilter}`,
      "",
      "KPIs",
      `- Patients: ${patientCount}`,
      `- Open alerts: ${openAlerts}`,
      `- Overdue tasks: ${overdueTasks}`,
      `- Active referrals: ${activeReferrals}`,
      `- Overdue referrals: ${overdueReferrals}`,
      `- Pending orders: ${pendingOrders}`,
      `- Open action items: ${openItemCount}`,
      "",
      "Priority actions",
      ...priorityActions.map(
        (a) => `- [${a.severity}] ${a.label}: ${a.count} → ${a.route}`,
      ),
      "",
      "Staff with open work",
      ...(staffWithWork.length
        ? staffWithWork.map((raw) => {
            const r = asRecord(raw);
            return `- ${String(r.displayName || r.email)} (${formatLabel(String(r.role))}): ${toNumber(r.totalOpenWork)} open`;
          })
        : ["- None"]),
      "",
      "Recent activity",
      ...(filteredActivity.length
        ? filteredActivity.map(
            (a) => `- ${a.at.toISOString()} | ${a.kind} | ${a.title} | ${a.detail}`,
          )
        : ["- No events"]),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aarogya360-ops-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [
    timeFilter,
    patientCount,
    openAlerts,
    overdueTasks,
    activeReferrals,
    overdueReferrals,
    pendingOrders,
    openItemCount,
    priorityActions,
    staffWithWork,
    filteredActivity,
  ]);

  // Keyboard shortcuts: r refresh, 1-6 open priority, g+i/p/u/l navigation
  useEffect(() => {
    let pendingG = false;
    let gTimer: number | undefined;

    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) return;

      if (pendingG) {
        pendingG = false;
        window.clearTimeout(gTimer);
        if (event.key === "i") {
          event.preventDefault();
          navigate("/portal/intake");
        } else if (event.key === "p") {
          event.preventDefault();
          navigate("/portal/admin/patients");
        } else if (event.key === "u") {
          event.preventDefault();
          navigate("/portal/admin/users");
        } else if (event.key === "l") {
          event.preventDefault();
          navigate("/portal/admin/leads");
        } else if (event.key === "s") {
          event.preventDefault();
          navigate("/portal/support");
        }
        return;
      }

      if (event.key === "g") {
        pendingG = true;
        gTimer = window.setTimeout(() => {
          pendingG = false;
        }, 800);
        return;
      }

      if (event.key === "r" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        refreshAll();
        return;
      }

      if (event.key >= "1" && event.key <= "6") {
        const index = Number(event.key) - 1;
        const action = activePriority[index] || priorityActions[index];
        if (action) {
          event.preventDefault();
          navigate(action.route);
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(gTimer);
    };
  }, [activePriority, navigate, priorityActions, refreshAll]);

  const kpiItems = [
    {
      key: "patients",
      label: "Patients",
      value: patientCount,
      href: "/portal/admin/patients",
      tone: patientCount === 0 ? "muted" : "default",
    },
    {
      key: "alerts",
      label: "Open alerts",
      value: openAlerts,
      href: "/portal/admin/patients",
      tone: openAlerts > 0 ? "danger" : "clear",
    },
    {
      key: "overdue",
      label: "Overdue tasks",
      value: overdueTasks,
      href: "/portal/admin/patients",
      tone: overdueTasks > 0 ? "warn" : "clear",
    },
    {
      key: "referrals",
      label: "Active referrals",
      value: activeReferrals,
      href: "/portal/admin/patients",
      tone: activeReferrals > 0 ? "default" : "clear",
    },
    {
      key: "overdue-refs",
      label: "Overdue referrals",
      value: overdueReferrals,
      href: "/portal/admin/patients",
      tone: overdueReferrals > 0 ? "warn" : "clear",
    },
    {
      key: "orders",
      label: "Open orders",
      value: pendingOrders,
      href: "/portal/admin/patients",
      tone: pendingOrders > 0 ? "default" : "clear",
    },
  ] as const;

  const subtitle = (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="tabular-nums text-foreground/90">
        {openItemCount} open item{openItemCount === 1 ? "" : "s"}
      </span>
      <span className="text-foreground/25">·</span>
      <span className="tabular-nums text-foreground/90">
        {patientCount} patient{patientCount === 1 ? "" : "s"}
      </span>
      <span className="text-foreground/25">·</span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            overview.isFetching ? "animate-pulse bg-amber-300" : "bg-primary",
          )}
        />
        Updated {relativeUpdated}
      </span>
    </span>
  );

  const statusChip = (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
      <Activity className="h-3.5 w-3.5" />
      Live
    </span>
  );

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-0.5">
        <button
          type="button"
          onClick={() => setTimeFilter("all")}
          className={cn(
            "rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
            timeFilter === "all"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          All time
        </button>
        <button
          type="button"
          onClick={() => setTimeFilter("today")}
          className={cn(
            "rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
            timeFilter === "today"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Today
        </button>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 rounded-full border-white/12 bg-white/[0.03]"
        onClick={refreshAll}
        disabled={overview.isFetching}
      >
        <RefreshCw className={cn("h-3.5 w-3.5", overview.isFetching && "animate-spin")} />
        Refresh
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 rounded-full border-white/12 bg-white/[0.03]"
        onClick={exportSummary}
      >
        <Download className="h-3.5 w-3.5" />
        Export
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 rounded-full border-white/12 bg-white/[0.03]"
        onClick={() => window.print()}
      >
        <Printer className="h-3.5 w-3.5" />
        Print
      </Button>
    </div>
  );

  return (
    <PortalShell
      title="Operations"
      subtitle={subtitle}
      statusChip={statusChip}
      headerActions={headerActions}
      compactHeader
    >
      <div id="admin-ops-print" className="space-y-4 print:space-y-3">
        {isError ? (
          <Alert variant="destructive" className="bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Dashboard unavailable</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3">
              <span>
                {overview.error instanceof Error
                  ? overview.error.message
                  : "Unable to load operations data."}
              </span>
              <Button type="button" size="sm" variant="outline" onClick={refreshAll}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-[72px]" />
              ))
            : kpiItems.map((kpi) => (
                <Link
                  key={kpi.key}
                  to={kpi.href}
                  className={cn(
                    "rounded-2xl border px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-primary/[0.04]",
                    kpi.tone === "danger" && "border-red-400/30 bg-red-400/[0.06]",
                    kpi.tone === "warn" && "border-amber-300/30 bg-amber-300/[0.06]",
                    kpi.tone === "clear" && "border-white/8 bg-white/[0.02]",
                    kpi.tone === "muted" && "border-white/8 bg-white/[0.02]",
                    kpi.tone === "default" && "border-white/8 bg-white/[0.03]",
                  )}
                >
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {kpi.label}
                  </p>
                  <p
                    className={cn(
                      "mt-1 font-display text-2xl font-bold tabular-nums tracking-[-0.04em]",
                      kpi.tone === "danger" && "text-red-200",
                      kpi.tone === "warn" && "text-amber-100",
                      kpi.tone === "clear" && "text-muted-foreground",
                    )}
                  >
                    {kpi.value}
                  </p>
                </Link>
              ))}
        </div>

        {/* Empty org onboarding */}
        {isNewOrg ? (
          <section className="rounded-[24px] border border-primary/25 bg-primary/[0.07] p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Get started
            </p>
            <h2 className="mt-2 font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Set up your clinic workspace
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              No patients yet. Complete these steps to start running care operations on
              live data.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Link
                to="/portal/intake"
                className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-background/40 px-4 py-3 transition-colors hover:border-primary/35 hover:bg-primary/10"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <ClipboardList className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">
                    Add first patient
                  </span>
                  <span className="block text-[12px] text-muted-foreground">
                    Intake & profile
                  </span>
                </span>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
              <Link
                to="/portal/admin/users"
                className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-background/40 px-4 py-3 transition-colors hover:border-primary/35 hover:bg-primary/10"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <UserPlus2 className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">
                    Invite care team
                  </span>
                  <span className="block text-[12px] text-muted-foreground">
                    Doctors & specialists
                  </span>
                </span>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
              <Link
                to="/portal/admin/leads"
                className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-background/40 px-4 py-3 transition-colors hover:border-primary/35 hover:bg-primary/10"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Users2 className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">
                    Review leads
                  </span>
                  <span className="block text-[12px] text-muted-foreground">
                    Inbound demo requests
                  </span>
                </span>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            </div>
          </section>
        ) : null}

        {/* Primary next action */}
        {!isNewOrg && !isLoading ? (
          primaryAction ? (
            <Link
              to={primaryAction.route}
              className={cn(
                "group flex flex-col gap-3 rounded-[24px] border p-4 transition-transform hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between sm:p-5",
                severityStyles(primaryAction.severity),
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20">
                  <primaryAction.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-80">
                    Next up · {primaryAction.severity}
                  </p>
                  <p className="mt-1 font-display text-lg font-semibold tracking-tight sm:text-xl">
                    {primaryAction.count}{" "}
                    {primaryAction.label.toLowerCase()}
                  </p>
                  <p className="mt-1 text-[13px] opacity-80">{primaryAction.description}</p>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-white/15 bg-black/20 px-4 py-2 text-sm font-semibold sm:self-center">
                Handle now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ) : (
            <div className="flex items-center gap-3 rounded-[24px] border border-primary/20 bg-primary/[0.06] px-4 py-3.5">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">All clear</p>
                <p className="text-[12px] text-muted-foreground">
                  No blocking operations items right now. Queues below stay monitored.
                </p>
              </div>
            </div>
          )
        ) : null}

        {/* Active priority list (non-zero only when work exists; clear strip when empty org) */}
        {!isNewOrg ? (
          <Panel
            title="Action queue"
            eyebrow="Priority"
            description={
              activePriority.length
                ? "Sorted by severity. Only items with open work are listed."
                : "No open priority items."
            }
            contentClassName="!py-3 !px-3 sm:!px-4"
            action={
              <span className="text-[11px] text-muted-foreground">
                Shortcuts: 1–6 open · R refresh · G then I/P/U/L
              </span>
            }
          >
            {isLoading ? (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonBlock key={i} className="h-20" />
                ))}
              </div>
            ) : activePriority.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-3 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Queues clear — no urgent admin actions.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {activePriority.map((action, index) => (
                  <Link
                    key={action.key}
                    to={action.route}
                    className={cn(
                      "rounded-2xl border px-3 py-3 transition-transform hover:-translate-y-0.5",
                      severityStyles(action.severity),
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/15">
                        <action.icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-75">
                            {action.severity}
                            {index < 6 ? ` · ${index + 1}` : ""}
                          </p>
                          <p className="font-display text-2xl font-bold tabular-nums leading-none">
                            {action.count}
                          </p>
                        </div>
                        <p className="mt-1 text-sm font-semibold leading-snug text-foreground">
                          {action.shortLabel}
                        </p>
                        <p className="mt-0.5 text-[12px] leading-snug opacity-75">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        ) : null}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_0.6fr]">
          <Panel
            title="Exception queues"
            eyebrow="Work"
            description="Dense live queues. Open links to full workspaces."
            contentClassName="!py-3 !px-3 sm:!px-4"
          >
            {isLoading ? (
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonBlock key={i} className="h-28" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                <QueueBlock
                  title="Care team gaps"
                  count={unassignedPatients.length}
                  href="/portal/admin/patients"
                  emptyLabel="All patients have care-team coverage."
                >
                  {unassignedPatients.slice(0, 4).map((item) => {
                    const row = asRecord(item);
                    const missing = [
                      row.missingPrimaryDoctor ? "primary doctor" : null,
                      row.missingSpecialist ? "specialist" : null,
                    ].filter(Boolean);
                    return (
                      <DenseRow
                        key={String(row.id)}
                        primary={<PatientLink item={row} />}
                        meta={`Missing ${missing.join(" & ")} · ${dateLabel(row.updatedAt)}`}
                        badge={
                          <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-muted-foreground">
                            S{toNumber(row.lifecycleStage)}
                          </span>
                        }
                      />
                    );
                  })}
                </QueueBlock>

                <QueueBlock
                  title="Clinical alerts"
                  count={urgentAlerts.length}
                  href="/portal/admin/patients"
                  emptyLabel="No open clinical alerts."
                >
                  {urgentAlerts.slice(0, 4).map((item) => {
                    const row = asRecord(item);
                    return (
                      <DenseRow
                        key={String(row.id)}
                        primary={<PatientLink item={row} />}
                        meta={`${String(row.priority || "MEDIUM")} · ${String(row.title || "Alert")} · ${dateLabel(row.createdAt)}`}
                      />
                    );
                  })}
                </QueueBlock>

                <QueueBlock
                  title="Overdue work"
                  count={overdueTaskItems.length + overdueReferralItems.length}
                  href="/portal/admin/patients"
                  emptyLabel="No overdue tasks or referrals."
                >
                  {[...overdueTaskItems, ...overdueReferralItems].slice(0, 4).map((item) => {
                    const row = asRecord(item);
                    const assignee = asRecord(row.assignedToUser);
                    return (
                      <DenseRow
                        key={String(row.id)}
                        primary={<PatientLink item={row} />}
                        meta={`${String(row.title || row.destinationName || "Work")} · Due ${dateLabel(row.dueAt)} · ${String(assignee.displayName || assignee.email || "Unassigned")}`}
                      />
                    );
                  })}
                </QueueBlock>

                <QueueBlock
                  title="Docs & support"
                  count={failedDocuments.length + openSupportTickets.length}
                  href="/portal/support"
                  emptyLabel="No failed documents or open tickets."
                >
                  {failedDocuments.slice(0, 2).map((item) => {
                    const row = asRecord(item);
                    return (
                      <DenseRow
                        key={`doc-${String(row.id)}`}
                        primary={<PatientLink item={row} />}
                        meta={`Failed document · ${String(row.type || "Clinical")} · ${dateLabel(row.updatedAt)}`}
                      />
                    );
                  })}
                  {openSupportTickets.slice(0, 2).map((item) => {
                    const row = asRecord(item);
                    return (
                      <DenseRow
                        key={`tix-${String(row.id)}`}
                        primary={String(row.subject || "Support ticket")}
                        meta={`${formatLabel(String(row.category || "OTHER"))} · ${formatLabel(String(row.priority || "NORMAL"))}`}
                      />
                    );
                  })}
                </QueueBlock>
              </div>
            )}
          </Panel>

          <div className="space-y-4">
            <Panel
              title="Staff workload"
              eyebrow="Load"
              description={
                staffWithWork.length
                  ? "Staff with open assigned work only."
                  : "No open assigned work."
              }
              contentClassName="!py-3 !px-3 sm:!px-4"
            >
              {isLoading ? (
                <div className="space-y-2">
                  <SkeletonBlock className="h-14" />
                  <SkeletonBlock className="h-14" />
                </div>
              ) : staffWithWork.length === 0 ? (
                <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-3">
                  <p className="text-sm text-muted-foreground">
                    No assignees with open tasks, orders, or referrals.
                  </p>
                  <Link
                    to="/portal/admin/users"
                    className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
                  >
                    <UserPlus2 className="h-3.5 w-3.5" />
                    Invite staff
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.05]">
                  {staffWithWork.slice(0, 8).map((item) => {
                    const row = asRecord(item);
                    return (
                      <div
                        key={String(row.id)}
                        className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-foreground">
                            {String(row.displayName || row.email || "Staff")}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatLabel(String(row.role || "STAFF"))} · T{" "}
                            {toNumber(row.activeTasks)} · O {toNumber(row.activeOrders)} · R{" "}
                            {toNumber(row.activeReferrals)}
                          </p>
                        </div>
                        <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-sm font-semibold tabular-nums text-primary">
                          {toNumber(row.totalOpenWork)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>

            <Panel
              title="Activity"
              eyebrow="Feed"
              description={
                timeFilter === "today"
                  ? "Org events from today (audit trail)."
                  : "Latest org events from the audit trail."
              }
              contentClassName="!py-3 !px-3 sm:!px-4"
              action={
                audit.isFetching ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                ) : null
              }
            >
              {audit.isLoading ? (
                <div className="space-y-2">
                  <SkeletonBlock className="h-10" />
                  <SkeletonBlock className="h-10" />
                  <SkeletonBlock className="h-10" />
                </div>
              ) : audit.isError ? (
                <p className="text-[12px] text-muted-foreground">
                  Audit feed unavailable. KPI data still loads from dashboard.
                </p>
              ) : filteredActivity.length === 0 ? (
                <p className="text-[12px] text-muted-foreground">
                  {timeFilter === "today"
                    ? "No audit events recorded today."
                    : "No audit events yet. Lifecycle and workflow actions will appear here."}
                </p>
              ) : (
                <ul className="space-y-0 divide-y divide-white/[0.05]">
                  {filteredActivity.map((item) => (
                    <li key={item.id} className="py-2 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-primary/70">
                            {item.kind}
                          </p>
                          <p className="mt-0.5 truncate text-[13px] font-medium text-foreground">
                            {item.title}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {item.detail}
                          </p>
                        </div>
                        <time className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                          {dateLabel(item.at)}
                        </time>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>

        <Panel
          title="Pipeline"
          eyebrow="Lifecycle"
          description="Stage distribution and recently updated patient records."
          contentClassName="!py-3 !px-3 sm:!px-4"
        >
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
              {isLoading ? (
                <SkeletonBlock className="h-40" />
              ) : lifecycle.length === 0 ? (
                <p className="text-sm text-muted-foreground">No lifecycle data yet.</p>
              ) : (
                <div className="space-y-2">
                  {lifecycle.map((item) => (
                    <div key={item.stage}>
                      <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Stage {item.stage}</span>
                        <span className="tabular-nums">{item.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10">
                        <div
                          className="h-1.5 rounded-full bg-gradient-to-r from-primary/70 to-primary"
                          style={{
                            width: `${Math.max(6, (item.count / maxCount(lifecycle)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.02]">
              {isLoading ? (
                <div className="space-y-2 p-3">
                  <SkeletonBlock className="h-10" />
                  <SkeletonBlock className="h-10" />
                </div>
              ) : filteredRecentPatients.length === 0 ? (
                <p className="px-3 py-3 text-sm text-muted-foreground">
                  {timeFilter === "today"
                    ? "No patient updates today."
                    : "No recent patient updates."}
                </p>
              ) : (
                filteredRecentPatients.slice(0, 6).map((item) => {
                  const row = asRecord(item);
                  return (
                    <DenseRow
                      key={String(row.id)}
                      primary={<PatientLink item={row} />}
                      meta={`Updated ${dateLabel(row.updatedAt)}`}
                      badge={
                        <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          S{toNumber(row.lifecycleStage)}
                        </span>
                      }
                    />
                  );
                })
              )}
            </div>
          </div>
        </Panel>

        {pendingFamilyInvites.length > 0 ? (
          <Panel
            title="Pending family consent"
            eyebrow="Access"
            description="Invitations awaiting patient approval."
            contentClassName="!py-3 !px-3 sm:!px-4"
          >
            <div className="divide-y divide-white/[0.05]">
              {pendingFamilyInvites.slice(0, 6).map((item) => {
                const row = asRecord(item);
                const family = asRecord(row.familyUser);
                return (
                  <DenseRow
                    key={String(row.id)}
                    primary={<PatientLink item={row} />}
                    meta={`${String(family.displayName || family.email || "Family member")} · ${formatLabel(String(row.accessLevel || ""))} · ${dateLabel(row.createdAt)}`}
                  />
                );
              })}
            </div>
          </Panel>
        ) : null}
      </div>
    </PortalShell>
  );
}
