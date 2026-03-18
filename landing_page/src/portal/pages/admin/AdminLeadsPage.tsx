import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock3,
  Filter,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  UserRoundPlus,
} from "lucide-react";
import { listAdminLeads, updateLeadStatus } from "@/lib/api/client";
import { PortalShell } from "@/portal/portal-shell";
import { Panel } from "@/portal/panel";

const statuses = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "CLOSED_WON",
  "CLOSED_LOST",
  "SPAM",
] as const;

type LeadStatus = (typeof statuses)[number];

type LeadRecord = {
  id: string;
  name: string;
  org: string;
  role?: string | null;
  email: string;
  phone?: string | null;
  message?: string | null;
  source?: string | null;
  status: LeadStatus;
  createdAt?: string;
};

function getStatusStyle(status: LeadStatus) {
  switch (status) {
    case "NEW":
      return "border-cyan-400/20 bg-cyan-400/[0.1] text-cyan-200";
    case "CONTACTED":
      return "border-indigo-400/20 bg-indigo-400/[0.1] text-indigo-200";
    case "QUALIFIED":
      return "border-emerald-400/20 bg-emerald-400/[0.1] text-emerald-200";
    case "CLOSED_WON":
      return "border-green-400/25 bg-green-400/[0.12] text-green-200";
    case "CLOSED_LOST":
      return "border-amber-400/20 bg-amber-400/[0.1] text-amber-200";
    case "SPAM":
      return "border-rose-400/20 bg-rose-400/[0.1] text-rose-200";
    default:
      return "border-white/10 bg-white/[0.06] text-foreground";
  }
}

export default function AdminLeadsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "ALL">("ALL");
  const deferredSearch = useDeferredValue(search);

  const leads = useQuery({ queryKey: ["admin", "leads"], queryFn: listAdminLeads });
  const rows = (leads.data || []) as Array<Record<string, unknown>>;

  const mutateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) =>
      updateLeadStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "leads"] }),
  });

  const typedLeads = useMemo(() => {
    return rows.map((row) => {
      const status = String(row.status) as LeadStatus;
      return {
        id: String(row.id || ""),
        name: String(row.name || "Unknown"),
        org: String(row.org || "Unknown"),
        role: row.role ? String(row.role) : null,
        email: String(row.email || ""),
        phone: row.phone ? String(row.phone) : null,
        message: row.message ? String(row.message) : null,
        source: row.source ? String(row.source) : null,
        status: statuses.includes(status) ? status : "NEW",
        createdAt: row.createdAt ? String(row.createdAt) : undefined,
      } as LeadRecord;
    });
  }, [rows]);

  const filteredLeads = useMemo(() => {
    return typedLeads.filter((lead) => {
      if (statusFilter !== "ALL" && lead.status !== statusFilter) return false;
      if (!deferredSearch.trim()) return true;

      const needle = deferredSearch.trim().toLowerCase();
      return (
        lead.name.toLowerCase().includes(needle) ||
        lead.org.toLowerCase().includes(needle) ||
        lead.email.toLowerCase().includes(needle) ||
        lead.status.toLowerCase().includes(needle)
      );
    });
  }, [typedLeads, deferredSearch, statusFilter]);

  const totalLeads = typedLeads.length;
  const activePipeline = typedLeads.filter((lead) =>
    ["NEW", "CONTACTED", "QUALIFIED"].includes(lead.status),
  ).length;
  const closedWon = typedLeads.filter((lead) => lead.status === "CLOSED_WON").length;
  const closedLostOrSpam = typedLeads.filter((lead) =>
    lead.status === "CLOSED_LOST" || lead.status === "SPAM",
  ).length;

  return (
    <PortalShell title="Demo Leads">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {[
          {
            label: "Total Leads",
            value: totalLeads,
            icon: UserRoundPlus,
            hint: "All captured demo requests",
          },
          {
            label: "Active Pipeline",
            value: activePipeline,
            icon: Filter,
            hint: "New, contacted, and qualified",
          },
          {
            label: "Closed Won",
            value: closedWon,
            icon: CheckCircle2,
            hint: "Converted opportunities",
          },
          {
            label: "Closed Lost / Spam",
            value: closedLostOrSpam,
            icon: Clock3,
            hint: "Dropped or invalid requests",
          },
        ].map((item) => (
          <Panel key={item.label} title={item.label} eyebrow="Lead Metric">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-4xl font-bold tracking-[-0.05em] text-foreground">
                  {item.value}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{item.hint}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" strokeWidth={1.8} />
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <Panel
        title="Inbound Requests"
        eyebrow="Lead Pipeline"
        description="Search requests, update status quickly, and keep top-of-funnel operations clean."
        className="mt-4"
      >
        <div className="mb-4 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_220px_auto]">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <Search className="h-4 w-4 text-primary" strokeWidth={1.8} />
              Search
            </p>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, organization, email, or status"
              className="h-12 w-full rounded-2xl border border-white/10 bg-background/70 px-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <Filter className="h-4 w-4 text-primary" strokeWidth={1.8} />
              Status
            </p>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "ALL")}
              className="h-12 w-full rounded-2xl border border-white/10 bg-background/70 px-4 text-sm text-foreground outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
            >
              <option value="ALL">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => qc.invalidateQueries({ queryKey: ["admin", "leads"] })}
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-5 text-sm font-medium text-foreground transition-all hover:border-primary/30"
            >
              <RefreshCw className="h-4 w-4" strokeWidth={1.8} />
              Refresh
            </button>
          </div>
        </div>

        {filteredLeads.length === 0 && !leads.isLoading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <div>
                <p className="font-display text-xl font-semibold text-foreground">No matching leads</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Submit from landing page <code>/contact</code> or change filters to see inbound requests.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          {filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-xl font-semibold tracking-[-0.03em] text-foreground">
                      {lead.name}
                    </p>
                    <span className="rounded-full border border-primary/20 bg-primary/[0.1] px-3 py-1 text-xs font-medium text-primary">
                      {lead.org}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusStyle(lead.status)}`}>
                      {lead.status}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-4 w-4 text-primary/80" strokeWidth={1.8} />
                      {lead.email}
                    </span>
                    {lead.phone ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-4 w-4 text-primary/80" strokeWidth={1.8} />
                        {lead.phone}
                      </span>
                    ) : null}
                    {lead.role ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Target className="h-4 w-4 text-primary/80" strokeWidth={1.8} />
                        {lead.role}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-foreground/85">{lead.message || "No message provided."}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Source: {lead.source || "landing_page"}
                    {lead.createdAt ? ` • ${new Date(lead.createdAt).toLocaleString()}` : ""}
                  </p>
                </div>

                <div className="xl:min-w-[210px]">
                  <p className="mb-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">Update status</p>
                  <select
                    value={lead.status}
                    onChange={(e) =>
                      mutateStatus.mutate({ id: lead.id, status: e.target.value as LeadStatus })
                    }
                    className="h-11 w-full rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        {leads.isLoading ? <p className="text-sm text-muted-foreground">Loading leads...</p> : null}
        {leads.isError ? <p className="text-sm text-secondary">Unable to load leads.</p> : null}
      </Panel>
    </PortalShell>
  );
}
