import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Route, UserPlus2 } from "lucide-react";
import {
  assignPatientCareTeam,
  createPatientRecord,
  listActiveDoctors,
  listActiveSpecialists,
  listPatients,
  updatePatientLifecycleStage,
} from "@/lib/api/client";
import { Panel } from "@/portal/panel";
import { PortalShell } from "@/portal/portal-shell";

const MRN_IDENTIFIER_SYSTEM = "https://aarogya360.app/fhir/identifier/mrn";
const PRIMARY_DOCTOR_EXTENSION_URL =
  "https://aarogya360.app/fhir/StructureDefinition/primary-doctor-user-id";

const inputClass =
  "h-12 w-full rounded-2xl border border-white/10 bg-background/70 px-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15";
const selectClass =
  "h-12 w-full rounded-2xl border border-white/10 bg-background/70 px-4 text-sm text-foreground outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/15";

type Clinician = {
  id: string;
  email: string;
};

function asArray<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function getPatientName(resource: unknown, fallbackId: string) {
  if (!resource || typeof resource !== "object") return `Patient ${fallbackId.slice(0, 8)}`;
  const typed = resource as {
    name?: Array<{ text?: string; given?: string[]; family?: string }>;
  };
  const primary = typed.name?.[0];
  if (!primary) return `Patient ${fallbackId.slice(0, 8)}`;
  if (primary.text?.trim()) return primary.text.trim();
  return [primary.given?.join(" "), primary.family].filter(Boolean).join(" ").trim() || `Patient ${fallbackId.slice(0, 8)}`;
}

function getExtensionValue(resource: unknown, url: string) {
  if (!resource || typeof resource !== "object") return "";
  const typed = resource as {
    extension?: Array<{ url?: string; valueString?: string }>;
  };
  return typed.extension?.find((item) => item.url === url)?.valueString || "";
}

export default function PortalIntakePage() {
  const qc = useQueryClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "unknown">("unknown");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [mrn, setMrn] = useState("");
  const [initialStage, setInitialStage] = useState(1);
  const [primaryDoctorUserId, setPrimaryDoctorUserId] = useState("");
  const [specialistUserId, setSpecialistUserId] = useState("");
  const [createInitialTask, setCreateInitialTask] = useState(true);
  const [createReferral, setCreateReferral] = useState(false);

  const patientsQuery = useQuery({ queryKey: ["intake", "patients"], queryFn: listPatients });
  const doctorsQuery = useQuery({ queryKey: ["intake", "doctors"], queryFn: listActiveDoctors });
  const specialistsQuery = useQuery({ queryKey: ["intake", "specialists"], queryFn: listActiveSpecialists });

  const doctors = useMemo(
    () =>
      asArray(doctorsQuery.data).map((row) => ({
        id: String(row.id || ""),
        email: String(row.email || ""),
      })) as Clinician[],
    [doctorsQuery.data],
  );
  const specialists = useMemo(
    () =>
      asArray(specialistsQuery.data).map((row) => ({
        id: String(row.id || ""),
        email: String(row.email || ""),
      })) as Clinician[],
    [specialistsQuery.data],
  );
  const recentPatients = useMemo(
    () =>
      asArray(patientsQuery.data)
        .slice(0, 6)
        .map((row) => {
          const resource = row.fhirResource;
          return {
            id: String(row.id || ""),
            name: getPatientName(resource, String(row.id || "")),
            stage: Number(row.lifecycleStage || 1),
            primaryDoctorUserId: getExtensionValue(resource, PRIMARY_DOCTOR_EXTENSION_URL),
            createdAt: String(row.createdAt || ""),
          };
        }),
    [patientsQuery.data],
  );

  const intakeMutation = useMutation({
    mutationFn: async () => {
      if (!firstName.trim() && !lastName.trim()) {
        throw new Error("First name or last name is required");
      }

      const fhir: Record<string, unknown> = {
        resourceType: "Patient",
        active: true,
        name: [
          {
            given: firstName.trim() ? [firstName.trim()] : [],
            family: lastName.trim() || undefined,
            text: [firstName.trim(), lastName.trim()].filter(Boolean).join(" "),
          },
        ],
      };

      if (gender) fhir.gender = gender;
      if (birthDate) fhir.birthDate = birthDate;

      const telecom: Array<{ system: string; value: string }> = [];
      if (email.trim()) telecom.push({ system: "email", value: email.trim() });
      if (phone.trim()) telecom.push({ system: "phone", value: phone.trim() });
      if (telecom.length > 0) fhir.telecom = telecom;
      if (mrn.trim()) fhir.identifier = [{ system: MRN_IDENTIFIER_SYSTEM, value: mrn.trim() }];

      const created = await createPatientRecord(fhir);
      const patientId = String((created as { id?: unknown }).id || "");
      if (!patientId) throw new Error("Patient was created but no id was returned");

      if (initialStage > 1) {
        await updatePatientLifecycleStage(patientId, {
          stage: initialStage,
          reason: "Initial stage set during shared intake",
        });
      }

      const shouldBootstrap =
        Boolean(primaryDoctorUserId) ||
        Boolean(specialistUserId) ||
        createInitialTask ||
        createReferral;

      if (shouldBootstrap) {
        await assignPatientCareTeam(patientId, {
          primaryDoctorUserId: primaryDoctorUserId || null,
          preferredSpecialistUserId: specialistUserId || null,
          createInitialTask,
          createReferral,
          referralPriority: "MEDIUM",
          referralReason: "Generated during shared intake",
        });
      }

      return patientId;
    },
    onSuccess: () => {
      setFirstName("");
      setLastName("");
      setGender("unknown");
      setBirthDate("");
      setEmail("");
      setPhone("");
      setMrn("");
      setInitialStage(1);
      setPrimaryDoctorUserId("");
      setSpecialistUserId("");
      setCreateInitialTask(true);
      setCreateReferral(false);
      qc.invalidateQueries({ queryKey: ["intake", "patients"] });
      qc.invalidateQueries({ queryKey: ["admin", "patients"] });
      qc.invalidateQueries({ queryKey: ["doctor", "caseload"] });
      qc.invalidateQueries({ queryKey: ["specialist", "caseload"] });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    intakeMutation.mutate();
  }

  return (
    <PortalShell title="Shared Patient Intake">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel
          title="Start Patient Intake"
          eyebrow="Admin + Doctor + Coordinator"
          description="Create the patient record, set the initial lifecycle stage, and route the first handoff without requiring full admin access."
        >
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">First name</span>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} placeholder="Patient first name" />
            </label>
            <label>
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Last name</span>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} placeholder="Patient last name" />
            </label>
            <label>
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Gender</span>
              <select value={gender} onChange={(e) => setGender(e.target.value as typeof gender)} className={selectClass}>
                <option value="unknown">Unknown</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Birth date</span>
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inputClass} />
            </label>
            <label>
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="patient@example.com" />
            </label>
            <label>
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Phone</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+91..." />
            </label>
            <label>
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">MRN</span>
              <input value={mrn} onChange={(e) => setMrn(e.target.value)} className={inputClass} placeholder="Medical record number" />
            </label>
            <label>
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Initial stage</span>
              <select value={initialStage} onChange={(e) => setInitialStage(Number(e.target.value))} className={selectClass}>
                {Array.from({ length: 10 }, (_, idx) => idx + 1).map((stage) => (
                  <option key={stage} value={stage}>
                    Stage {stage}
                  </option>
                ))}
              </select>
            </label>
            <label className="md:col-span-2">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Primary doctor</span>
              <select value={primaryDoctorUserId} onChange={(e) => setPrimaryDoctorUserId(e.target.value)} className={selectClass}>
                <option value="">Unassigned doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="md:col-span-2">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Preferred specialist</span>
              <select value={specialistUserId} onChange={(e) => setSpecialistUserId(e.target.value)} className={selectClass}>
                <option value="">Specialist pool</option>
                {specialists.map((specialist) => (
                  <option key={specialist.id} value={specialist.id}>
                    {specialist.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="md:col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={createInitialTask} onChange={(e) => setCreateInitialTask(e.target.checked)} className="h-4 w-4 rounded border-white/20 bg-background" />
              Create initial doctor intake task
            </label>
            <label className="md:col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={createReferral} onChange={(e) => setCreateReferral(e.target.checked)} className="h-4 w-4 rounded border-white/20 bg-background" />
              Create specialist consultation referral
            </label>
            <button type="submit" disabled={intakeMutation.isPending} className="btn-shimmer md:col-span-2 inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-70">
              <UserPlus2 className="h-4 w-4" strokeWidth={1.8} />
              {intakeMutation.isPending ? "Creating..." : "Create Intake"}
            </button>
            {intakeMutation.isError ? (
              <div className="md:col-span-2 rounded-2xl border border-amber/20 bg-amber/[0.08] px-4 py-3 text-sm text-amber-100">
                {intakeMutation.error instanceof Error ? intakeMutation.error.message : "Unable to create intake"}
              </div>
            ) : null}
          </form>
        </Panel>

        <div className="space-y-4">
          <Panel
            title="Intake Rules"
            eyebrow="Operational Guardrails"
            description="Intake is permissioned separately from full administration."
          >
            <div className="space-y-3 text-sm text-muted-foreground">
              <p className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                Admins manage all records, assignments, users, family access, and audit controls.
              </p>
              <p className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                Doctors and care coordinators can create intake records and route initial care-team ownership.
              </p>
              <p className="rounded-2xl border border-primary/15 bg-primary/[0.07] p-3 text-primary/90">
                Specialist intake remains referral-led; use specialist routing when a consult should start immediately.
              </p>
            </div>
          </Panel>

          <Panel title="Recent Intakes" eyebrow="Created Patients" description="Latest patient records visible in your organization.">
            <div className="space-y-2">
              {recentPatients.map((patient) => (
                <div key={patient.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-base font-semibold text-foreground">{patient.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Stage {patient.stage} · {patient.primaryDoctorUserId ? "Doctor assigned" : "Doctor unassigned"}</p>
                    </div>
                    <Route className="h-4 w-4 text-primary" strokeWidth={1.8} />
                  </div>
                </div>
              ))}
              {recentPatients.length === 0 ? (
                <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                  {patientsQuery.isLoading ? "Loading intakes..." : "No patient records yet."}
                </p>
              ) : null}
            </div>
          </Panel>

          <div className="rounded-[28px] border border-white/8 bg-white/[0.025] p-5">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary/70">
              <ClipboardList className="h-4 w-4" strokeWidth={1.8} />
              Access path
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Open <span className="text-foreground">Portal → Intake</span>. Admins, doctors, and care coordinators see this workspace automatically in the sidebar.
            </p>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
