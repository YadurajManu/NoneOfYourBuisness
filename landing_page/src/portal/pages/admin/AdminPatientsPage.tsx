import { FormEvent, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ClipboardList,
  Clock3,
  Filter,
  HeartPulse,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldMinus,
  Stethoscope,
  UserPlus2,
  UserRound,
  UserRoundCheck,
} from "lucide-react";
import {
  assignPatientCareTeam,
  createFamilyAccessInvite,
  createPatientRecord,
  listActiveDoctors,
  listActiveSpecialists,
  listFamilyAccessAuditForPatient,
  listFamilyAccessGrantsForPatient,
  listFamilyAccessInvitesForPatient,
  listPatients,
  revokeFamilyAccessGrant,
  updatePatientLifecycleStage,
  updatePatientProfile,
} from "@/lib/api/client";
import { PortalShell } from "@/portal/portal-shell";
import { Panel } from "@/portal/panel";

const PRIMARY_DOCTOR_EXTENSION_URL =
  "https://aarogya360.app/fhir/StructureDefinition/primary-doctor-user-id";
const PREFERRED_SPECIALIST_EXTENSION_URL =
  "https://aarogya360.app/fhir/StructureDefinition/preferred-specialist-user-id";
const MRN_IDENTIFIER_SYSTEM = "https://aarogya360.app/fhir/identifier/mrn";

type Clinician = {
  id: string;
  email: string;
};

type FamilyAccessLevel = "VIEW_ONLY" | "FULL_UPDATES" | "EMERGENCY_CONTACT";

type PatientView = {
  id: string;
  lifecycleStage: number;
  createdAt: string;
  updatedAt: string;
  displayName: string;
  firstName: string;
  lastName: string;
  gender: "male" | "female" | "other" | "unknown" | "";
  birthDate: string;
  email: string;
  phone: string;
  medicalRecordNumber: string;
  primaryDoctorUserId: string;
  preferredSpecialistUserId: string;
};

type FamilyInviteView = {
  id: string;
  familyEmail: string;
  invitedByEmail: string;
  accessLevel: FamilyAccessLevel;
  status: string;
  consentNote: string | null;
  expiresAt: string | null;
  createdAt: string;
  respondedAt: string | null;
  responseNote: string | null;
};

type FamilyGrantView = {
  id: string;
  familyEmail: string;
  accessLevel: FamilyAccessLevel;
  status: string;
  consentNote: string | null;
  grantedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
};

type FamilyAuditView = {
  id: string;
  action: string;
  note: string | null;
  actorEmail: string;
  createdAt: string;
};

const inputClass =
  "h-12 w-full rounded-2xl border border-white/10 bg-background/70 px-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15";
const selectClass =
  "h-12 w-full rounded-2xl border border-white/10 bg-background/70 px-4 text-sm text-foreground outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/15";

function getExtensionValue(resource: unknown, url: string) {
  if (!resource || typeof resource !== "object") return "";

  const typed = resource as {
    extension?: Array<{ url?: string; valueString?: string }>;
  };

  const ext = typed.extension?.find((item) => item.url === url);
  return ext?.valueString || "";
}

function getMrn(resource: unknown) {
  if (!resource || typeof resource !== "object") return "";

  const typed = resource as {
    identifier?: Array<{ system?: string; value?: string }>;
  };

  return typed.identifier?.find((item) => item.system === MRN_IDENTIFIER_SYSTEM)?.value || "";
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

function getPatientFirstName(resource: unknown) {
  if (!resource || typeof resource !== "object") return "";
  const typed = resource as {
    name?: Array<{ given?: string[] }>;
  };
  const primary = typed.name?.[0];
  return Array.isArray(primary?.given) ? String(primary?.given[0] || "") : "";
}

function getPatientLastName(resource: unknown) {
  if (!resource || typeof resource !== "object") return "";
  const typed = resource as {
    name?: Array<{ family?: string }>;
  };
  return String(typed.name?.[0]?.family || "");
}

function getTelecom(resource: unknown, system: "email" | "phone") {
  if (!resource || typeof resource !== "object") return "";
  const typed = resource as {
    telecom?: Array<{ system?: string; value?: string }>;
  };
  return typed.telecom?.find((row) => row.system === system)?.value || "";
}

function stageBadge(stage: number) {
  if (stage >= 8) return "border-rose-400/20 bg-rose-400/[0.1] text-rose-200";
  if (stage >= 5) return "border-amber-400/20 bg-amber-400/[0.1] text-amber-200";
  return "border-emerald-400/20 bg-emerald-400/[0.1] text-emerald-200";
}

function asArray<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export default function AdminPatientsPage() {
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [assignmentFilter, setAssignmentFilter] = useState<
    "ALL" | "UNASSIGNED_DOCTOR" | "UNASSIGNED_SPECIALIST" | "FULLY_ASSIGNED"
  >("ALL");
  const deferredSearch = useDeferredValue(search);

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createGender, setCreateGender] = useState<"male" | "female" | "other" | "unknown">("unknown");
  const [createBirthDate, setCreateBirthDate] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createMrn, setCreateMrn] = useState("");
  const [createStage, setCreateStage] = useState(1);
  const [createPrimaryDoctorUserId, setCreatePrimaryDoctorUserId] = useState("");
  const [createSpecialistUserId, setCreateSpecialistUserId] = useState("");
  const [createInitialTask, setCreateInitialTask] = useState(true);
  const [createReferral, setCreateReferral] = useState(true);

  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editGender, setEditGender] = useState<"male" | "female" | "other" | "unknown" | "">("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editMrn, setEditMrn] = useState("");

  const [editPrimaryDoctorUserId, setEditPrimaryDoctorUserId] = useState("");
  const [editSpecialistUserId, setEditSpecialistUserId] = useState("");
  const [assignCreateTask, setAssignCreateTask] = useState(false);
  const [assignCreateReferral, setAssignCreateReferral] = useState(false);
  const [assignReferralPriority, setAssignReferralPriority] =
    useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [assignReferralReason, setAssignReferralReason] = useState("");

  const [nextStage, setNextStage] = useState(1);
  const [stageReason, setStageReason] = useState("");

  const [familyInviteEmail, setFamilyInviteEmail] = useState("");
  const [familyInviteAccessLevel, setFamilyInviteAccessLevel] =
    useState<FamilyAccessLevel>("VIEW_ONLY");
  const [familyInviteConsentNote, setFamilyInviteConsentNote] = useState("");
  const [familyInviteExpiresAt, setFamilyInviteExpiresAt] = useState("");

  const patientsQuery = useQuery({ queryKey: ["admin", "patients"], queryFn: listPatients });
  const doctorsQuery = useQuery({ queryKey: ["admin", "doctors"], queryFn: listActiveDoctors });
  const specialistsQuery = useQuery({ queryKey: ["admin", "specialists"], queryFn: listActiveSpecialists });
  const familyInvitesQuery = useQuery({
    queryKey: ["admin", "patients", selectedPatientId, "family-invites"],
    queryFn: () =>
      selectedPatientId
        ? listFamilyAccessInvitesForPatient(selectedPatientId)
        : Promise.resolve([]),
    enabled: Boolean(selectedPatientId),
  });
  const familyGrantsQuery = useQuery({
    queryKey: ["admin", "patients", selectedPatientId, "family-grants"],
    queryFn: () =>
      selectedPatientId
        ? listFamilyAccessGrantsForPatient(selectedPatientId)
        : Promise.resolve([]),
    enabled: Boolean(selectedPatientId),
  });
  const familyAuditQuery = useQuery({
    queryKey: ["admin", "patients", selectedPatientId, "family-audit"],
    queryFn: () =>
      selectedPatientId
        ? listFamilyAccessAuditForPatient(selectedPatientId)
        : Promise.resolve([]),
    enabled: Boolean(selectedPatientId),
  });

  const doctors = ((doctorsQuery.data || []) as Array<Record<string, unknown>>)
    .map((row) => ({ id: String(row.id || ""), email: String(row.email || "") }))
    .filter((row) => row.id.length > 0) as Clinician[];

  const specialists = ((specialistsQuery.data || []) as Array<Record<string, unknown>>)
    .map((row) => ({ id: String(row.id || ""), email: String(row.email || "") }))
    .filter((row) => row.id.length > 0) as Clinician[];

  const doctorById = useMemo(() => {
    return Object.fromEntries(doctors.map((doctor) => [doctor.id, doctor.email]));
  }, [doctors]);

  const specialistById = useMemo(() => {
    return Object.fromEntries(specialists.map((specialist) => [specialist.id, specialist.email]));
  }, [specialists]);

  const patients = useMemo(() => {
    return ((patientsQuery.data || []) as Array<Record<string, unknown>>)
      .map((row) => {
        const fhirResource = row.fhirResource;
        const id = String(row.id || "");

        return {
          id,
          lifecycleStage: Number(row.lifecycleStage || 1),
          createdAt: String(row.createdAt || ""),
          updatedAt: String(row.updatedAt || ""),
          displayName: getPatientName(fhirResource, id),
          firstName: getPatientFirstName(fhirResource),
          lastName: getPatientLastName(fhirResource),
          gender:
            ((typeof (fhirResource as { gender?: unknown } | undefined)?.gender === "string"
              ? (fhirResource as { gender?: string }).gender
              : "") as PatientView["gender"]) || "",
          birthDate:
            typeof (fhirResource as { birthDate?: unknown } | undefined)?.birthDate === "string"
              ? String((fhirResource as { birthDate?: string }).birthDate)
              : "",
          email: getTelecom(fhirResource, "email"),
          phone: getTelecom(fhirResource, "phone"),
          medicalRecordNumber: getMrn(fhirResource),
          primaryDoctorUserId: getExtensionValue(fhirResource, PRIMARY_DOCTOR_EXTENSION_URL),
          preferredSpecialistUserId: getExtensionValue(fhirResource, PREFERRED_SPECIALIST_EXTENSION_URL),
        } as PatientView;
      })
      .filter((row) => row.id.length > 0);
  }, [patientsQuery.data]);

  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      if (stageFilter !== "ALL" && String(patient.lifecycleStage) !== stageFilter) {
        return false;
      }

      if (assignmentFilter === "UNASSIGNED_DOCTOR" && patient.primaryDoctorUserId) {
        return false;
      }

      if (assignmentFilter === "UNASSIGNED_SPECIALIST" && patient.preferredSpecialistUserId) {
        return false;
      }

      if (
        assignmentFilter === "FULLY_ASSIGNED" &&
        (!patient.primaryDoctorUserId || !patient.preferredSpecialistUserId)
      ) {
        return false;
      }

      if (!deferredSearch.trim()) return true;
      const needle = deferredSearch.trim().toLowerCase();
      return (
        patient.displayName.toLowerCase().includes(needle) ||
        patient.id.toLowerCase().includes(needle) ||
        patient.email.toLowerCase().includes(needle) ||
        patient.phone.toLowerCase().includes(needle) ||
        patient.medicalRecordNumber.toLowerCase().includes(needle)
      );
    });
  }, [patients, stageFilter, assignmentFilter, deferredSearch]);

  useEffect(() => {
    if (filteredPatients.length === 0) {
      setSelectedPatientId(null);
      return;
    }

    if (!selectedPatientId || !filteredPatients.some((row) => row.id === selectedPatientId)) {
      setSelectedPatientId(filteredPatients[0].id);
    }
  }, [filteredPatients, selectedPatientId]);

  const selectedPatient =
    filteredPatients.find((patient) => patient.id === selectedPatientId) ||
    patients.find((patient) => patient.id === selectedPatientId) ||
    null;

  useEffect(() => {
    if (!selectedPatient) return;

    setEditFirstName(selectedPatient.firstName || "");
    setEditLastName(selectedPatient.lastName || "");
    setEditGender(selectedPatient.gender || "");
    setEditBirthDate(selectedPatient.birthDate || "");
    setEditEmail(selectedPatient.email || "");
    setEditPhone(selectedPatient.phone || "");
    setEditMrn(selectedPatient.medicalRecordNumber || "");
    setEditPrimaryDoctorUserId(selectedPatient.primaryDoctorUserId || "");
    setEditSpecialistUserId(selectedPatient.preferredSpecialistUserId || "");
    setAssignCreateTask(false);
    setAssignCreateReferral(false);
    setAssignReferralPriority("MEDIUM");
    setAssignReferralReason("");
    setNextStage(selectedPatient.lifecycleStage);
    setStageReason("");
  }, [selectedPatient?.id]);

  const familyInvites = useMemo(() => {
    return asArray<Record<string, unknown>>(familyInvitesQuery.data).map((row) => {
      const familyUser = asRecord(row.familyUser);
      const invitedByUser = asRecord(row.invitedByUser);

      return {
        id: String(row.id || ""),
        familyEmail: String(familyUser.email || "Unknown"),
        invitedByEmail: String(invitedByUser.email || "Unknown"),
        accessLevel: String(row.accessLevel || "VIEW_ONLY") as FamilyAccessLevel,
        status: String(row.status || "PENDING"),
        consentNote: row.consentNote ? String(row.consentNote) : null,
        expiresAt: row.expiresAt ? String(row.expiresAt) : null,
        createdAt: String(row.createdAt || ""),
        respondedAt: row.respondedAt ? String(row.respondedAt) : null,
        responseNote: row.responseNote ? String(row.responseNote) : null,
      } as FamilyInviteView;
    });
  }, [familyInvitesQuery.data]);

  const familyGrants = useMemo(() => {
    return asArray<Record<string, unknown>>(familyGrantsQuery.data).map((row) => {
      const familyUser = asRecord(row.familyUser);

      return {
        id: String(row.id || ""),
        familyEmail: String(familyUser.email || "Unknown"),
        accessLevel: String(row.accessLevel || "VIEW_ONLY") as FamilyAccessLevel,
        status: String(row.status || "ACTIVE"),
        consentNote: row.consentNote ? String(row.consentNote) : null,
        grantedAt: String(row.grantedAt || row.createdAt || ""),
        expiresAt: row.expiresAt ? String(row.expiresAt) : null,
        revokedAt: row.revokedAt ? String(row.revokedAt) : null,
      } as FamilyGrantView;
    });
  }, [familyGrantsQuery.data]);

  const familyAudit = useMemo(() => {
    return asArray<Record<string, unknown>>(familyAuditQuery.data).map((row) => {
      const actor = asRecord(row.actor);

      return {
        id: String(row.id || ""),
        action: String(row.action || "UNKNOWN"),
        note: row.note ? String(row.note) : null,
        actorEmail: String(actor.email || "Unknown"),
        createdAt: String(row.createdAt || ""),
      } as FamilyAuditView;
    });
  }, [familyAuditQuery.data]);

  const createPatientMutation = useMutation({
    mutationFn: async () => {
      if (!createFirstName.trim() && !createLastName.trim()) {
        throw new Error("First name or last name is required");
      }

      const fhir: Record<string, unknown> = {
        resourceType: "Patient",
        active: true,
        name: [
          {
            given: createFirstName.trim() ? [createFirstName.trim()] : [],
            family: createLastName.trim() || undefined,
            text: [createFirstName.trim(), createLastName.trim()].filter(Boolean).join(" "),
          },
        ],
      };

      if (createGender) fhir.gender = createGender;
      if (createBirthDate) fhir.birthDate = createBirthDate;

      const telecom: Array<{ system: string; value: string }> = [];
      if (createEmail.trim()) telecom.push({ system: "email", value: createEmail.trim() });
      if (createPhone.trim()) telecom.push({ system: "phone", value: createPhone.trim() });
      if (telecom.length > 0) fhir.telecom = telecom;

      if (createMrn.trim()) {
        fhir.identifier = [{ system: MRN_IDENTIFIER_SYSTEM, value: createMrn.trim() }];
      }

      const created = await createPatientRecord(fhir);
      const createdId = String((created as { id?: unknown }).id || "");
      if (!createdId) {
        throw new Error("Patient was created but no patient id was returned");
      }

      if (createStage > 1) {
        await updatePatientLifecycleStage(createdId, {
          stage: createStage,
          reason: "Initial stage set during admin intake",
        });
      }

      const shouldAssign =
        Boolean(createPrimaryDoctorUserId) ||
        Boolean(createSpecialistUserId) ||
        createInitialTask ||
        createReferral;

      if (shouldAssign) {
        await assignPatientCareTeam(createdId, {
          primaryDoctorUserId: createPrimaryDoctorUserId || null,
          preferredSpecialistUserId: createSpecialistUserId || null,
          createInitialTask,
          createReferral,
          referralPriority: "MEDIUM",
          referralReason: "Generated during admin intake",
        });
      }

      return createdId;
    },
    onSuccess: (createdId) => {
      setCreateFirstName("");
      setCreateLastName("");
      setCreateGender("unknown");
      setCreateBirthDate("");
      setCreateEmail("");
      setCreatePhone("");
      setCreateMrn("");
      setCreateStage(1);
      setCreatePrimaryDoctorUserId("");
      setCreateSpecialistUserId("");
      setCreateInitialTask(true);
      setCreateReferral(true);
      qc.invalidateQueries({ queryKey: ["admin", "patients"] });
      qc.invalidateQueries({ queryKey: ["doctor", "caseload"] });
      qc.invalidateQueries({ queryKey: ["specialist", "caseload"] });
      qc.invalidateQueries({ queryKey: ["specialist", "referral-pool"] });
      setSelectedPatientId(createdId);
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: () => {
      if (!selectedPatientId) throw new Error("No patient selected");
      return updatePatientProfile(selectedPatientId, {
        firstName: editFirstName.trim() || undefined,
        lastName: editLastName.trim() || undefined,
        gender: (editGender || undefined) as "male" | "female" | "other" | "unknown" | undefined,
        birthDate: editBirthDate || undefined,
        email: editEmail.trim() || undefined,
        phone: editPhone.trim() || undefined,
        medicalRecordNumber: editMrn.trim() || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "patients"] });
      qc.invalidateQueries({ queryKey: ["doctor", "caseload"] });
      qc.invalidateQueries({ queryKey: ["specialist", "caseload"] });
    },
  });

  const assignTeamMutation = useMutation({
    mutationFn: () => {
      if (!selectedPatientId) throw new Error("No patient selected");
      return assignPatientCareTeam(selectedPatientId, {
        primaryDoctorUserId: editPrimaryDoctorUserId || null,
        preferredSpecialistUserId: editSpecialistUserId || null,
        createInitialTask: assignCreateTask,
        createReferral: assignCreateReferral,
        referralPriority: assignReferralPriority,
        referralReason: assignReferralReason.trim() || undefined,
      });
    },
    onSuccess: () => {
      setAssignCreateTask(false);
      setAssignCreateReferral(false);
      setAssignReferralReason("");
      qc.invalidateQueries({ queryKey: ["admin", "patients"] });
      qc.invalidateQueries({ queryKey: ["doctor", "caseload"] });
      qc.invalidateQueries({ queryKey: ["specialist", "caseload"] });
      qc.invalidateQueries({ queryKey: ["specialist", "referral-pool"] });
    },
  });

  const stageMutation = useMutation({
    mutationFn: () => {
      if (!selectedPatientId) throw new Error("No patient selected");
      return updatePatientLifecycleStage(selectedPatientId, {
        stage: nextStage,
        reason: stageReason.trim() || "Updated from admin patient workspace",
      });
    },
    onSuccess: () => {
      setStageReason("");
      qc.invalidateQueries({ queryKey: ["admin", "patients"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "overview"] });
      qc.invalidateQueries({ queryKey: ["doctor", "caseload"] });
      qc.invalidateQueries({ queryKey: ["specialist", "caseload"] });
    },
  });

  const inviteFamilyMutation = useMutation({
    mutationFn: () => {
      if (!selectedPatientId) throw new Error("No patient selected");
      if (!familyInviteEmail.trim()) throw new Error("Family email is required");

      return createFamilyAccessInvite(selectedPatientId, {
        familyEmail: familyInviteEmail.trim(),
        accessLevel: familyInviteAccessLevel,
        consentNote: familyInviteConsentNote.trim() || undefined,
        expiresAt: familyInviteExpiresAt
          ? new Date(familyInviteExpiresAt).toISOString()
          : undefined,
      });
    },
    onSuccess: () => {
      setFamilyInviteEmail("");
      setFamilyInviteAccessLevel("VIEW_ONLY");
      setFamilyInviteConsentNote("");
      setFamilyInviteExpiresAt("");
      qc.invalidateQueries({
        queryKey: ["admin", "patients", selectedPatientId, "family-invites"],
      });
      qc.invalidateQueries({
        queryKey: ["admin", "patients", selectedPatientId, "family-audit"],
      });
    },
  });

  const revokeFamilyMutation = useMutation({
    mutationFn: (payload: { accessId: string; note?: string }) =>
      revokeFamilyAccessGrant(payload.accessId, payload.note),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["admin", "patients", selectedPatientId, "family-grants"],
      });
      qc.invalidateQueries({
        queryKey: ["admin", "patients", selectedPatientId, "family-audit"],
      });
    },
  });

  const totalPatients = patients.length;
  const activeCases = patients.filter((row) => row.lifecycleStage >= 5).length;
  const doctorAssigned = patients.filter((row) => Boolean(row.primaryDoctorUserId)).length;
  const specialistAssigned = patients.filter((row) => Boolean(row.preferredSpecialistUserId)).length;
  const pendingFamilyInvites = familyInvites.filter((row) => row.status === "PENDING").length;
  const activeFamilyGrants = familyGrants.filter((row) => row.status === "ACTIVE").length;

  function onCreatePatient(e: FormEvent) {
    e.preventDefault();
    createPatientMutation.mutate();
  }

  function onUpdateProfile(e: FormEvent) {
    e.preventDefault();
    updateProfileMutation.mutate();
  }

  function onAssignTeam(e: FormEvent) {
    e.preventDefault();
    assignTeamMutation.mutate();
  }

  function onUpdateStage(e: FormEvent) {
    e.preventDefault();
    stageMutation.mutate();
  }

  function onInviteFamily(e: FormEvent) {
    e.preventDefault();
    inviteFamilyMutation.mutate();
  }

  return (
    <PortalShell title="Patient Registry">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {[
          {
            label: "Total Patients",
            value: totalPatients,
            hint: "Profiles created in this organization",
            icon: UserRound,
          },
          {
            label: "Stage 5+ Active",
            value: activeCases,
            hint: "Patients in active treatment cycle",
            icon: HeartPulse,
          },
          {
            label: "Doctor Assigned",
            value: doctorAssigned,
            hint: "Patients with primary doctor assignment",
            icon: UserRoundCheck,
          },
          {
            label: "Specialist Assigned",
            value: specialistAssigned,
            hint: "Patients with specialist route attached",
            icon: Stethoscope,
          },
        ].map((metric) => (
          <Panel key={metric.label} title={metric.label} eyebrow="Registry Metric">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-4xl font-bold tracking-[-0.05em] text-foreground">
                  {metric.value}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{metric.hint}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <metric.icon className="h-5 w-5" strokeWidth={1.8} />
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel
          title="Patient Registry"
          eyebrow="Search and Select"
          description="Find patients quickly, check assignment status, and open the selected patient operations workspace."
          className="h-full"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_170px_220px_auto]">
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <Search className="h-4 w-4 text-primary" strokeWidth={1.8} />
                Search
              </p>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by patient name, id, email, phone, or MRN"
                className={inputClass}
              />
            </div>

            <div>
              <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <Filter className="h-4 w-4 text-primary" strokeWidth={1.8} />
                Stage
              </p>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className={selectClass}
              >
                <option value="ALL">All stages</option>
                {Array.from({ length: 10 }, (_, idx) => idx + 1).map((stage) => (
                  <option key={stage} value={String(stage)}>
                    Stage {stage}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">Assignment</p>
              <select
                value={assignmentFilter}
                onChange={(e) =>
                  setAssignmentFilter(
                    e.target.value as
                      | "ALL"
                      | "UNASSIGNED_DOCTOR"
                      | "UNASSIGNED_SPECIALIST"
                      | "FULLY_ASSIGNED",
                  )
                }
                className={selectClass}
              >
                <option value="ALL">All patients</option>
                <option value="UNASSIGNED_DOCTOR">Doctor unassigned</option>
                <option value="UNASSIGNED_SPECIALIST">Specialist unassigned</option>
                <option value="FULLY_ASSIGNED">Doctor + specialist assigned</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => qc.invalidateQueries({ queryKey: ["admin", "patients"] })}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-5 text-sm font-medium text-foreground transition-all hover:border-primary/30"
              >
                <RefreshCw className="h-4 w-4" strokeWidth={1.8} />
                Refresh
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {filteredPatients.map((patient) => (
              <button
                key={patient.id}
                onClick={() => setSelectedPatientId(patient.id)}
                className={`w-full rounded-[24px] border p-4 text-left transition-all ${
                  selectedPatientId === patient.id
                    ? "border-primary/30 bg-primary/[0.08] shadow-[0_0_0_1px_rgba(0,212,200,0.1)]"
                    : "border-white/8 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-xl font-semibold tracking-[-0.03em] text-foreground">
                      {patient.displayName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">ID: {patient.id}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {patient.email || "No email"}
                      {patient.phone ? ` • ${patient.phone}` : ""}
                      {patient.medicalRecordNumber ? ` • MRN ${patient.medicalRecordNumber}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Primary doctor: {doctorById[patient.primaryDoctorUserId] || "Unassigned"}
                      {" • "}
                      Specialist: {specialistById[patient.preferredSpecialistUserId] || "Unassigned"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${stageBadge(patient.lifecycleStage)}`}
                  >
                    Stage {patient.lifecycleStage}
                  </span>
                </div>
              </button>
            ))}

            {filteredPatients.length === 0 && !patientsQuery.isLoading ? (
              <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                No patients match your filters.
              </p>
            ) : null}

            {patientsQuery.isLoading ? (
              <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                Loading patients...
              </p>
            ) : null}
          </div>
        </Panel>

        <Panel
          title="Patient Intake"
          eyebrow="Create and Bootstrap"
          description="Create patient profile, set starting stage, and optionally trigger first doctor task/referral in one submit."
          className="h-full"
        >
          <form onSubmit={onCreatePatient} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">First name</span>
              <input
                value={createFirstName}
                onChange={(e) => setCreateFirstName(e.target.value)}
                className={inputClass}
                placeholder="Patient first name"
              />
            </label>
            <label>
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Last name</span>
              <input
                value={createLastName}
                onChange={(e) => setCreateLastName(e.target.value)}
                className={inputClass}
                placeholder="Patient last name"
              />
            </label>

            <label>
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Gender</span>
              <select
                value={createGender}
                onChange={(e) => setCreateGender(e.target.value as typeof createGender)}
                className={selectClass}
              >
                <option value="unknown">Unknown</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Birth date</span>
              <input
                type="date"
                value={createBirthDate}
                onChange={(e) => setCreateBirthDate(e.target.value)}
                className={inputClass}
              />
            </label>

            <label>
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Email</span>
              <input
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                className={inputClass}
                placeholder="patient@example.com"
              />
            </label>
            <label>
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Phone</span>
              <input
                value={createPhone}
                onChange={(e) => setCreatePhone(e.target.value)}
                className={inputClass}
                placeholder="+91..."
              />
            </label>

            <label>
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">MRN</span>
              <input
                value={createMrn}
                onChange={(e) => setCreateMrn(e.target.value)}
                className={inputClass}
                placeholder="Medical record number"
              />
            </label>
            <label>
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Initial stage</span>
              <select
                value={createStage}
                onChange={(e) => setCreateStage(Number(e.target.value))}
                className={selectClass}
              >
                {Array.from({ length: 10 }, (_, idx) => idx + 1).map((stage) => (
                  <option key={stage} value={stage}>
                    Stage {stage}
                  </option>
                ))}
              </select>
            </label>

            <label className="md:col-span-2">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Primary doctor</span>
              <select
                value={createPrimaryDoctorUserId}
                onChange={(e) => setCreatePrimaryDoctorUserId(e.target.value)}
                className={selectClass}
              >
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
              <select
                value={createSpecialistUserId}
                onChange={(e) => setCreateSpecialistUserId(e.target.value)}
                className={selectClass}
              >
                <option value="">Specialist pool</option>
                {specialists.map((specialist) => (
                  <option key={specialist.id} value={specialist.id}>
                    {specialist.email}
                  </option>
                ))}
              </select>
            </label>

            <label className="md:col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={createInitialTask}
                onChange={(e) => setCreateInitialTask(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-background"
              />
              Create initial doctor intake task
            </label>

            <label className="md:col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={createReferral}
                onChange={(e) => setCreateReferral(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-background"
              />
              Create specialist consultation order + referral
            </label>

            <button
              type="submit"
              disabled={createPatientMutation.isPending}
              className="btn-shimmer md:col-span-2 inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-70"
            >
              <UserPlus2 className="h-4 w-4" strokeWidth={1.8} />
              {createPatientMutation.isPending ? "Creating..." : "Create Patient"}
            </button>

            {createPatientMutation.isError ? (
              <div className="md:col-span-2 rounded-2xl border border-amber/20 bg-amber/[0.08] px-4 py-3 text-sm text-amber-100">
                {createPatientMutation.error instanceof Error
                  ? createPatientMutation.error.message
                  : "Unable to create patient"}
              </div>
            ) : null}
          </form>
        </Panel>
      </div>

      <Panel
        title={selectedPatient ? `${selectedPatient.displayName} Workspace` : "Selected Patient Workspace"}
        eyebrow="Edit, Assign, and Stage"
        description={
          selectedPatient
            ? `Patient ID: ${selectedPatient.id}`
            : "Select a patient from registry to manage profile, staffing, and lifecycle stage."
        }
        className="mt-4"
      >
        {selectedPatient ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <form onSubmit={onUpdateProfile} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary/70">
                <UserRound className="h-4 w-4" strokeWidth={1.8} />
                Profile
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3">
                <input
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className={inputClass}
                  placeholder="First name"
                />
                <input
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  className={inputClass}
                  placeholder="Last name"
                />
                <select
                  value={editGender || "unknown"}
                  onChange={(e) => setEditGender(e.target.value as typeof editGender)}
                  className={selectClass}
                >
                  <option value="unknown">Unknown</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type="date"
                  value={editBirthDate}
                  onChange={(e) => setEditBirthDate(e.target.value)}
                  className={inputClass}
                />
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className={inputClass}
                  placeholder="Email"
                />
                <input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className={inputClass}
                  placeholder="Phone"
                />
                <input
                  value={editMrn}
                  onChange={(e) => setEditMrn(e.target.value)}
                  className={inputClass}
                  placeholder="Medical record number"
                />
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-foreground transition-colors hover:border-primary/30 disabled:opacity-60"
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>

            <form onSubmit={onAssignTeam} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary/70">
                <Stethoscope className="h-4 w-4" strokeWidth={1.8} />
                Care Team Assignment
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3">
                <select
                  value={editPrimaryDoctorUserId}
                  onChange={(e) => setEditPrimaryDoctorUserId(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Unassigned doctor</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.email}
                    </option>
                  ))}
                </select>

                <select
                  value={editSpecialistUserId}
                  onChange={(e) => setEditSpecialistUserId(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Specialist pool</option>
                  {specialists.map((specialist) => (
                    <option key={specialist.id} value={specialist.id}>
                      {specialist.email}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={assignCreateTask}
                    onChange={(e) => setAssignCreateTask(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-background"
                  />
                  Create doctor intake task
                </label>

                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={assignCreateReferral}
                    onChange={(e) => setAssignCreateReferral(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-background"
                  />
                  Create specialist referral
                </label>

                <select
                  value={assignReferralPriority}
                  onChange={(e) => setAssignReferralPriority(e.target.value as typeof assignReferralPriority)}
                  className={selectClass}
                  disabled={!assignCreateReferral}
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>

                <input
                  value={assignReferralReason}
                  onChange={(e) => setAssignReferralReason(e.target.value)}
                  className={inputClass}
                  placeholder="Referral reason (optional)"
                  disabled={!assignCreateReferral}
                />

                <button
                  type="submit"
                  disabled={assignTeamMutation.isPending}
                  className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-foreground transition-colors hover:border-primary/30 disabled:opacity-60"
                >
                  {assignTeamMutation.isPending ? "Applying..." : "Apply Assignment"}
                </button>
              </div>
            </form>

            <form onSubmit={onUpdateStage} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary/70">
                <ClipboardList className="h-4 w-4" strokeWidth={1.8} />
                Lifecycle Stage
              </p>

              <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Current stage</p>
                <p className="mt-2 font-display text-4xl font-bold tracking-[-0.05em] text-foreground">
                  {selectedPatient.lifecycleStage}
                </p>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3">
                <select
                  value={nextStage}
                  onChange={(e) => setNextStage(Number(e.target.value))}
                  className={selectClass}
                >
                  {Array.from({ length: 10 }, (_, idx) => idx + 1).map((stage) => (
                    <option key={stage} value={stage}>
                      Move to Stage {stage}
                    </option>
                  ))}
                </select>

                <input
                  value={stageReason}
                  onChange={(e) => setStageReason(e.target.value)}
                  className={inputClass}
                  placeholder="Stage transition reason"
                />

                <button
                  type="submit"
                  disabled={stageMutation.isPending}
                  className="h-12 rounded-2xl border border-primary/30 bg-primary/10 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
                >
                  {stageMutation.isPending ? "Updating..." : "Update Stage"}
                </button>
              </div>
            </form>

            <div className="xl:col-span-3 space-y-4">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <form
                  onSubmit={onInviteFamily}
                  className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4"
                >
                  <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary/70">
                    <Mail className="h-4 w-4" strokeWidth={1.8} />
                    Family Invitation Request
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Doctor/admin can request family visibility. Patient approves or rejects from the consent inbox.
                  </p>

                  <div className="mt-3 grid grid-cols-1 gap-3">
                    <input
                      type="email"
                      value={familyInviteEmail}
                      onChange={(e) => setFamilyInviteEmail(e.target.value)}
                      className={inputClass}
                      placeholder="family.member@domain.com"
                      required
                    />

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <select
                        value={familyInviteAccessLevel}
                        onChange={(e) =>
                          setFamilyInviteAccessLevel(
                            e.target.value as FamilyAccessLevel,
                          )
                        }
                        className={selectClass}
                      >
                        <option value="VIEW_ONLY">VIEW_ONLY</option>
                        <option value="FULL_UPDATES">FULL_UPDATES</option>
                        <option value="EMERGENCY_CONTACT">EMERGENCY_CONTACT</option>
                      </select>

                      <input
                        type="date"
                        value={familyInviteExpiresAt}
                        onChange={(e) => setFamilyInviteExpiresAt(e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <textarea
                      value={familyInviteConsentNote}
                      onChange={(e) => setFamilyInviteConsentNote(e.target.value)}
                      className="min-h-[96px] w-full rounded-2xl border border-white/10 bg-background/70 px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
                      placeholder="Consent note or reason for family access request"
                    />

                    <button
                      type="submit"
                      disabled={inviteFamilyMutation.isPending}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
                    >
                      {inviteFamilyMutation.isPending ? "Sending..." : "Send Invite for Patient Consent"}
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-3 py-2">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Pending</p>
                        <p className="mt-1 font-display text-3xl font-bold tracking-[-0.04em] text-foreground">
                          {pendingFamilyInvites}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-3 py-2">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Active Grants</p>
                        <p className="mt-1 font-display text-3xl font-bold tracking-[-0.04em] text-foreground">
                          {activeFamilyGrants}
                        </p>
                      </div>
                    </div>
                  </div>
                </form>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                    <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary/70">
                      <Clock3 className="h-4 w-4" strokeWidth={1.8} />
                      Invite Queue
                    </p>
                    <div className="mt-3 space-y-3">
                      {familyInvites.length === 0 && !familyInvitesQuery.isLoading ? (
                        <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-3 text-sm text-muted-foreground">
                          No family invites for this patient.
                        </p>
                      ) : null}

                      {familyInvites.slice(0, 6).map((row) => (
                        <article key={row.id} className="rounded-2xl border border-white/8 bg-background/50 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium text-foreground">{row.familyEmail}</p>
                            <span className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                              {row.status}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {row.accessLevel} • {formatDate(row.createdAt)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Expiry: {row.expiresAt ? formatDate(row.expiresAt) : "No expiry"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {row.consentNote || "No consent note"}
                          </p>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                    <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary/70">
                      <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />
                      Access Grants
                    </p>
                    <div className="mt-3 space-y-3">
                      {familyGrants.length === 0 && !familyGrantsQuery.isLoading ? (
                        <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-3 text-sm text-muted-foreground">
                          No granted access for this patient yet.
                        </p>
                      ) : null}

                      {familyGrants.slice(0, 6).map((row) => (
                        <article key={row.id} className="rounded-2xl border border-white/8 bg-background/50 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium text-foreground">{row.familyEmail}</p>
                            <span
                              className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${
                                row.status === "ACTIVE"
                                  ? "border-emerald-400/20 bg-emerald-400/[0.1] text-emerald-200"
                                  : "border-amber/25 bg-amber/[0.1] text-amber/90"
                              }`}
                            >
                              {row.status}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {row.accessLevel} • Granted {formatDate(row.grantedAt)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Expiry: {row.expiresAt ? formatDate(row.expiresAt) : "No expiry"}
                          </p>
                          {row.status === "ACTIVE" ? (
                            <button
                              type="button"
                              onClick={() => revokeFamilyMutation.mutate({ accessId: row.id })}
                              disabled={revokeFamilyMutation.isPending}
                              className="mt-2 inline-flex h-8 items-center rounded-full border border-amber/30 bg-amber/[0.1] px-3 text-xs font-medium text-amber/90 transition-colors hover:bg-amber/[0.16] disabled:opacity-60"
                            >
                              Revoke
                            </button>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary/70">
                  <ShieldMinus className="h-4 w-4" strokeWidth={1.8} />
                  Family Access Audit Trail
                </p>
                <div className="mt-3 space-y-3">
                  {familyAudit.length === 0 && !familyAuditQuery.isLoading ? (
                    <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-3 text-sm text-muted-foreground">
                      No audit records yet.
                    </p>
                  ) : null}

                  {familyAudit.slice(0, 12).map((row) => (
                    <article key={row.id} className="rounded-2xl border border-white/8 bg-background/50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          {row.action}
                        </span>
                        <p className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Actor: {row.actorEmail}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{row.note || "No note"}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
            Select a patient from the registry to open this workspace.
          </p>
        )}

        {updateProfileMutation.isError ||
        assignTeamMutation.isError ||
        stageMutation.isError ||
        inviteFamilyMutation.isError ||
        revokeFamilyMutation.isError ? (
          <div className="mt-4 rounded-2xl border border-amber/20 bg-amber/[0.08] p-4 text-sm text-amber-100">
            One action failed. Check values and retry.
          </div>
        ) : null}
      </Panel>

      {patientsQuery.isError ||
      doctorsQuery.isError ||
      specialistsQuery.isError ||
      familyInvitesQuery.isError ||
      familyGrantsQuery.isError ||
      familyAuditQuery.isError ? (
        <div className="mt-4 rounded-2xl border border-amber/20 bg-amber/[0.08] p-4 text-sm text-amber-100">
          <p className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" strokeWidth={1.8} />
            Unable to load full admin patient workspace data. Refresh and retry.
          </p>
        </div>
      ) : null}
    </PortalShell>
  );
}
