import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, FilePlus2, FileText, ShieldAlert, Timer } from "lucide-react";
import {
  getPatientPortalDocuments,
  getPatientPortalMe,
  getPatientPortalTimeline,
  uploadPatientPortalDocument,
} from "@/lib/api/client";
import { Panel } from "@/portal/panel";
import { PortalShell } from "@/portal/portal-shell";

function asArray<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function getPatientName(resource: unknown, fallbackId: string) {
  if (!resource || typeof resource !== "object") return `Patient ${fallbackId.slice(0, 8)}`;

  const typed = resource as {
    name?: Array<{ text?: string; given?: string[]; family?: string }>;
  };
  const first = typed.name?.[0];

  if (!first) return `Patient ${fallbackId.slice(0, 8)}`;
  if (first.text && first.text.trim().length > 0) return first.text.trim();

  const fullName = [first.given?.join(" "), first.family].filter(Boolean).join(" ").trim();
  return fullName.length > 0 ? fullName : `Patient ${fallbackId.slice(0, 8)}`;
}

export default function PatientDashboardPage() {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);

  const meQuery = useQuery({ queryKey: ["patient", "me"], queryFn: getPatientPortalMe });
  const timelineQuery = useQuery({ queryKey: ["patient", "timeline"], queryFn: getPatientPortalTimeline });
  const documentsQuery = useQuery({ queryKey: ["patient", "documents"], queryFn: getPatientPortalDocuments });

  const uploadMutation = useMutation({
    mutationFn: () => uploadPatientPortalDocument(file as File),
    onSuccess: () => {
      setFile(null);
      qc.invalidateQueries({ queryKey: ["patient", "documents"] });
      qc.invalidateQueries({ queryKey: ["patient", "timeline"] });
    },
  });

  const profile = (meQuery.data || {}) as Record<string, unknown>;
  const patient = (profile.patient || {}) as Record<string, unknown>;

  const timeline = (timelineQuery.data || {}) as Record<string, unknown>;
  const events = asArray<Record<string, unknown>>(timeline.events).slice(0, 15);
  const clinicalEvents = asArray<Record<string, unknown>>(timeline.clinicalEvents);

  const documents = useMemo(() => {
    return asArray<Record<string, unknown>>(documentsQuery.data).map((row) => ({
      id: String(row.id || ""),
      type: String(row.type || "DOCUMENT"),
      status: String(row.status || "PENDING"),
      createdAt: String(row.createdAt || ""),
    }));
  }, [documentsQuery.data]);

  const openAlerts = clinicalEvents.filter((event) => {
    const alert = (event.alert || {}) as Record<string, unknown>;
    return String(alert.status || "") === "OPEN";
  }).length;

  const patientId = String(patient.id || "");
  const patientName = patientId ? getPatientName(patient.fhirResource, patientId) : "Patient";
  const stage = Number(patient.lifecycleStage || 0);

  function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    uploadMutation.mutate();
  }

  return (
    <PortalShell title="Patient Dashboard">
      <Panel
        title="My Care Journey"
        eyebrow="Patient Workspace"
        description="Review your current stage, timeline updates, and document records while staying synced with your care team."
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Profile</p>
            <h3 className="mt-3 font-display text-3xl font-bold tracking-[-0.05em] text-foreground">{patientName}</h3>
            <p className="mt-2 text-sm text-muted-foreground">Account: {String((profile.user as Record<string, unknown>)?.email || "-")}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-primary/25 bg-primary/[0.1] px-3 py-1 text-xs uppercase tracking-[0.16em] text-primary/80">
                Stage {stage || "-"}
              </span>
              <span className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Patient ID {patientId ? patientId.slice(0, 8) : "-"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              {
                label: "Documents",
                value: documents.length,
                note: "Stored in portal",
                icon: FileText,
              },
              {
                label: "Open Alerts",
                value: openAlerts,
                note: "Care team monitoring",
                icon: ShieldAlert,
              },
              {
                label: "Timeline Events",
                value: events.length,
                note: "Most recent 15",
                icon: Activity,
              },
              {
                label: "Last Update",
                value: patient.updatedAt ? new Date(String(patient.updatedAt)).toLocaleDateString() : "-",
                note: "Record refreshed",
                icon: Timer,
              },
            ].map((metric) => (
              <div key={metric.label} className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{metric.label}</p>
                    <p className="mt-2 font-display text-2xl font-bold tracking-[-0.04em] text-foreground">{metric.value}</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <metric.icon className="h-4 w-4" strokeWidth={1.8} />
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{metric.note}</p>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel
          title="Timeline Snapshot"
          eyebrow="Latest Events"
          description="A chronological view of your recent care, document, and workflow events."
          className="h-full"
        >
          <div className="space-y-2">
            {events.length === 0 && !timelineQuery.isLoading ? (
              <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                No timeline updates yet.
              </p>
            ) : null}

            {events.map((event, idx) => (
              <article key={`${String(event.type)}-${String(event.at)}-${idx}`} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-primary/70">{String(event.type || "EVENT")}</p>
                <p className="mt-1 text-sm text-foreground/90">{String(event.detail || "-")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(String(event.at || "")).toLocaleString()}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel
          title="My Documents"
          eyebrow="Upload and Track"
          description="Upload personal records and monitor processing status in the shared patient timeline."
          className="h-full"
        >
          <form onSubmit={handleUpload} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Upload document</p>
            <label className="mt-3 flex h-12 cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-muted-foreground">
              <span className="truncate pr-3">{file ? file.name : "Select file"}</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
                <FilePlus2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                Browse
              </span>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                required
              />
            </label>

            <button
              type="submit"
              disabled={!file || uploadMutation.isPending}
              className="mt-3 h-10 rounded-xl border border-primary/30 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
            >
              {uploadMutation.isPending ? "Uploading..." : "Upload to Timeline"}
            </button>
          </form>

          <div className="mt-3 space-y-2">
            {documents.length === 0 && !documentsQuery.isLoading ? (
              <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                No documents uploaded yet.
              </p>
            ) : null}

            {documents.slice(0, 10).map((document) => (
              <div key={document.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-foreground/90">{document.type}</p>
                  <span
                    className={`rounded-full border px-2 py-1 text-[11px] uppercase tracking-[0.12em] ${
                      document.status === "COMPLETED"
                        ? "border-emerald-400/20 bg-emerald-400/[0.1] text-emerald-200"
                        : document.status === "FAILED"
                          ? "border-rose-400/20 bg-rose-400/[0.1] text-rose-200"
                          : "border-amber/25 bg-amber/[0.1] text-amber/90"
                    }`}
                  >
                    {document.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(document.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {meQuery.isError ? <p className="mt-4 text-secondary">Unable to load patient profile.</p> : null}
      {timelineQuery.isError ? <p className="mt-2 text-secondary">Unable to load timeline.</p> : null}
      {documentsQuery.isError ? <p className="mt-2 text-secondary">Unable to load documents.</p> : null}
      {uploadMutation.isError ? <p className="mt-2 text-secondary">Unable to upload document.</p> : null}
    </PortalShell>
  );
}
