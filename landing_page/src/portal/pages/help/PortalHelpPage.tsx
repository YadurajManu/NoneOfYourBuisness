import type { UserRole } from "@/lib/api/types";
import { useAuth } from "@/portal/auth-context";
import { Panel } from "@/portal/panel";
import { PortalShell } from "@/portal/portal-shell";

type RoleGuide = {
  title: string;
  workflow: string[];
  features: string[];
  limits: string[];
};

const guideByRole: Record<UserRole, RoleGuide> = {
  ADMIN: {
    title: "Admin Operations Guide",
    workflow: [
      "Create organization users (doctor, specialist, patient, family).",
      "Create and assign patients to doctor/specialist care owners.",
      "Monitor dashboard metrics, lifecycle stage movement, and lead pipeline.",
      "Audit consent, family access, and account suspension history.",
    ],
    features: [
      "Overview KPIs and operational status cards",
      "Patient intake, care-team assignment, and profile edits",
      "Lead management and status updates",
      "User creation, role changes, suspension controls",
      "Patient-context family invitation and audit visibility",
    ],
    limits: [
      "Clinical decisions are made by doctors/specialists, not admins.",
      "Family member data visibility depends on patient consent status.",
    ],
  },
  DOCTOR: {
    title: "Doctor Clinical Guide",
    workflow: [
      "Open Caseload and select patient from queue.",
      "Update lifecycle stage and chart events/orders/referrals.",
      "Upload report photo or PDF; OCR + structured extraction runs automatically.",
      "Invite family from patient context when consent workflow is needed.",
    ],
    features: [
      "Caseload command center with stage/order/referral operations",
      "Detailed patient profile with timeline, docs, alerts, orders, referrals",
      "Specialist assignment and referral routing",
      "Document upload with mobile camera capture support",
      "Family question response and consent-aware communication",
    ],
    limits: [
      "Doctor can view only organization-scoped data.",
      "Family upload/edit capabilities depend on granted access level.",
    ],
  },
  SPECIALIST: {
    title: "Specialist Execution Guide",
    workflow: [
      "Claim or receive referred patients into specialist queue.",
      "Open patient context and review timeline + shared reports.",
      "Update referral/order statuses and log specialist events.",
      "Upload specialist report images/PDF for shared care visibility.",
    ],
    features: [
      "Specialist pool claim flow and assigned caseload",
      "Specialist action cards for referral/order/event updates",
      "Patient full-profile navigation for complete context",
      "Document uploads with OCR extraction for rapid review",
    ],
    limits: [
      "Specialist panel only shows patients assigned/claimed to specialist flow.",
      "Cross-organization access is blocked by backend guards.",
    ],
  },
  PATIENT: {
    title: "Patient Self-Service Guide",
    workflow: [
      "Review current stage and timeline updates in profile dashboard.",
      "Upload personal records (photo/PDF) to shared timeline.",
      "Review and respond to pending family access invites.",
      "Grant/revoke family access and monitor audit history.",
    ],
    features: [
      "Patient timeline and document status cards",
      "Mobile camera upload for bedside report photos",
      "Family consent inbox (approve/reject)",
      "Family access audit and expiration visibility",
    ],
    limits: [
      "Patient account must be linked to one patient profile.",
      "Invite responses apply only to patient-owned records.",
    ],
  },
  FAMILY_MEMBER: {
    title: "Family Member Guide",
    workflow: [
      "Open My Patients and select a consent-granted patient.",
      "Track notifications and mark reviewed events as read.",
      "Ask care-team questions through Questions page.",
      "If access level allows, upload supporting report photo/PDF.",
    ],
    features: [
      "Consent-scoped patient visibility and stage updates",
      "Notification channel preferences (in-app/email/SMS)",
      "Family question submission and response tracking",
      "Document view + upload (when not VIEW_ONLY)",
    ],
    limits: [
      "Access expires automatically when configured by patient/care team.",
      "VIEW_ONLY access cannot upload new reports.",
    ],
  },
};

const roleMatrix = [
  { role: "Admin", upload: "Yes", consent: "Manage + audit", dashboard: "Operations + users + leads" },
  { role: "Doctor", upload: "Yes", consent: "Invite family", dashboard: "Clinical caseload + patient actions" },
  { role: "Specialist", upload: "Yes", consent: "View from patient context", dashboard: "Referral queue + specialist actions" },
  { role: "Patient", upload: "Yes", consent: "Approve/reject + grant/revoke", dashboard: "Self profile + docs + family access" },
  { role: "Family", upload: "Conditional", consent: "Consent recipient", dashboard: "Shared patient + notifications + questions" },
];

export default function PortalHelpPage() {
  const { user } = useAuth();
  if (!user) return null;

  const activeGuide = guideByRole[user.role];

  return (
    <PortalShell title="Help and Workflow Guide (LAIQ)">
      <Panel
        title={activeGuide.title}
        eyebrow="Role Playbook"
        description="Use this role-specific guide to operate the portal workflow correctly, including uploads, consent, and patient actions."
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-primary/70">Daily workflow</p>
            <ol className="mt-3 space-y-2 text-sm text-foreground/90">
              {activeGuide.workflow.map((step, idx) => (
                <li key={step} className="rounded-xl border border-white/10 bg-background/50 px-3 py-2">
                  {idx + 1}. {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-primary/70">Available features</p>
            <ul className="mt-3 space-y-2 text-sm text-foreground/90">
              {activeGuide.features.map((feature) => (
                <li key={feature} className="rounded-xl border border-white/10 bg-background/50 px-3 py-2">
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-primary/70">Access boundaries</p>
            <ul className="mt-3 space-y-2 text-sm text-foreground/90">
              {activeGuide.limits.map((limit) => (
                <li key={limit} className="rounded-xl border border-amber/20 bg-amber/[0.06] px-3 py-2 text-amber/90">
                  {limit}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Panel>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel
          title="Cross-Role Capability Matrix"
          eyebrow="Who Can Do What"
          description="This matrix is the source of truth for role-level capabilities in the connected portal."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Report Upload</th>
                  <th className="px-3 py-2">Consent</th>
                  <th className="px-3 py-2">Primary Workspace</th>
                </tr>
              </thead>
              <tbody>
                {roleMatrix.map((row) => (
                  <tr key={row.role} className="rounded-2xl border border-white/8 bg-white/[0.03]">
                    <td className="rounded-l-xl border border-white/8 bg-background/50 px-3 py-2 text-sm text-foreground/90">{row.role}</td>
                    <td className="border-y border-white/8 bg-background/50 px-3 py-2 text-sm text-foreground/90">{row.upload}</td>
                    <td className="border-y border-white/8 bg-background/50 px-3 py-2 text-sm text-foreground/90">{row.consent}</td>
                    <td className="rounded-r-xl border border-white/8 bg-background/50 px-3 py-2 text-sm text-foreground/90">{row.dashboard}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title="Report OCR and Extraction Flow"
          eyebrow="Document Intelligence"
          description="When a report image or PDF is uploaded, the backend extracts searchable clinical data automatically."
        >
          <ol className="space-y-2 text-sm text-foreground/90">
            <li className="rounded-xl border border-white/10 bg-background/50 px-3 py-2">
              1. File upload validates type/size policy and stores securely.
            </li>
            <li className="rounded-xl border border-white/10 bg-background/50 px-3 py-2">
              2. OCR runs for images; PDF/text extraction runs for other formats.
            </li>
            <li className="rounded-xl border border-white/10 bg-background/50 px-3 py-2">
              3. Structured extraction maps diagnoses, meds, vitals, labs, and recommendations.
            </li>
            <li className="rounded-xl border border-white/10 bg-background/50 px-3 py-2">
              4. Timeline/document cards show status and extracted clinical signals for action.
            </li>
          </ol>
        </Panel>
      </div>
    </PortalShell>
  );
}
