import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Building2,
  ShieldPlus,
  Stethoscope,
  UserPlus2,
  Users2,
} from "lucide-react";
import {
  createAdminUser,
  listAdminUsers,
  resolveApiAssetUrl,
  setAdminUserSuspension,
  updateAdminUserRole,
} from "@/lib/api/client";
import { useAuth } from "@/portal/auth-context";
import { PortalShell } from "@/portal/portal-shell";
import { Panel } from "@/portal/panel";

type Role = "ADMIN" | "DOCTOR" | "SPECIALIST" | "PATIENT" | "FAMILY_MEMBER";

const roles: Role[] = ["ADMIN", "DOCTOR", "SPECIALIST", "PATIENT", "FAMILY_MEMBER"];

const roleConfig: Record<
  Role,
  {
    label: string;
    hint: string;
  }
> = {
  ADMIN: {
    label: "Admin",
    hint: "Platform and access governance",
  },
  DOCTOR: {
    label: "Doctor",
    hint: "Primary clinical coordination",
  },
  SPECIALIST: {
    label: "Specialist",
    hint: "Focused referral-based workflows",
  },
  PATIENT: {
    label: "Patient",
    hint: "Self-service portal access",
  },
  FAMILY_MEMBER: {
    label: "Family",
    hint: "Consent-based visibility and updates",
  },
};

function formatRole(role: string) {
  return role.replace("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function initials(nameOrEmail: string) {
  return nameOrEmail
    .split(/[ @._-]+/)
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const { user: authUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("DOCTOR");
  const [patientName, setPatientName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const users = useQuery({ queryKey: ["admin", "users"], queryFn: listAdminUsers });

  const createUserMutation = useMutation({
    mutationFn: () =>
      createAdminUser({
        email,
        password,
        role,
        patientName: role === "PATIENT" ? patientName : undefined,
        displayName: displayName.trim() || undefined,
      }),
    onSuccess: () => {
      setEmail("");
      setPassword("");
      setRole("DOCTOR");
      setPatientName("");
      setDisplayName("");
      setError(null);
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to create user"),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, nextRole }: { userId: string; nextRole: Role }) =>
      updateAdminUserRole(userId, nextRole),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  const suspendMutation = useMutation({
    mutationFn: ({ userId, suspended }: { userId: string; suspended: boolean }) =>
      setAdminUserSuspension(userId, suspended),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  const rows = (users.data || []) as Array<Record<string, unknown>>;
  const activeUsers = rows.filter((row) => !Boolean(row.isSuspended)).length;
  const suspendedUsers = rows.length - activeUsers;
  const clinicians = rows.filter((row) => {
    const roleValue = String(row.role);
    return roleValue === "DOCTOR" || roleValue === "SPECIALIST";
  }).length;
  const patients = rows.filter((row) => String(row.role) === "PATIENT").length;

  function handleCreateUser(e: FormEvent) {
    e.preventDefault();
    setError(null);
    createUserMutation.mutate();
  }

  return (
    <PortalShell title="User Management">
      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Panel
          title="Organization Access Map"
          eyebrow="Operations Snapshot"
          description="Track how your workspace is staffed before assigning patients, referrals, and admin duties."
          className="h-full"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              {
                label: "Total users",
                value: rows.length,
                note: "All portal accounts in this organization",
                icon: Users2,
              },
              {
                label: "Active",
                value: activeUsers,
                note: "Currently available for portal access",
                icon: BadgeCheck,
              },
              {
                label: "Clinical staff",
                value: clinicians,
                note: "Doctors and specialists ready for caseloads",
                icon: Stethoscope,
              },
              {
                label: "Patients",
                value: patients,
                note: "Linked self-service patient accounts",
                icon: Building2,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-3 font-display text-4xl font-bold tracking-[-0.05em] text-foreground">
                      {item.value}
                    </p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" strokeWidth={1.8} />
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{item.note}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Access Risk"
          eyebrow="Control Signal"
          description="Suspended users remain preserved for audit but are blocked from active portal use."
          className="h-full"
          contentClassName="h-full"
        >
          <div className="flex h-full items-stretch">
            <div className="w-full rounded-[24px] border border-amber/20 bg-amber/[0.08] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-amber/80">Suspended accounts</p>
              <p className="mt-3 font-display text-5xl font-bold tracking-[-0.05em] text-foreground">
                {suspendedUsers}
              </p>
              <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                Keep this count near zero unless access has been intentionally paused for compliance or staffing changes.
              </p>
            </div>
          </div>
        </Panel>
      </div>

      <Panel
        title="Create User"
        eyebrow="Provision Access"
        description="Invite doctors, specialists, family members, admins, or patient accounts without leaving the portal."
        className="mt-4"
      >
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
                <ShieldPlus className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Selected role</p>
                <h3 className="font-display text-2xl font-semibold tracking-[-0.03em] text-foreground">
                  {roleConfig[role].label}
                </h3>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {roleConfig[role].hint}
            </p>

            {role === "PATIENT" ? (
              <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/[0.07] p-4 text-sm leading-6 text-foreground/85">
                Patient account creation also links a patient profile so the portal can show timeline, documents, and family consent controls immediately.
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-white/8 bg-background/40 p-4 text-sm leading-6 text-muted-foreground">
                Non-patient users are created directly inside your organization and can be reassigned or suspended later from the roster below.
              </div>
            )}
          </div>

          <form onSubmit={handleCreateUser} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@hospital.org"
                className="h-12 w-full rounded-2xl border border-white/10 bg-background/70 px-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Temporary password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="h-12 w-full rounded-2xl border border-white/10 bg-background/70 px-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
                minLength={8}
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Role</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="h-12 w-full rounded-2xl border border-white/10 bg-background/70 px-4 text-sm text-foreground outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {formatRole(r)}
                  </option>
                ))}
              </select>
            </label>

            {role === "PATIENT" ? (
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Patient display name</span>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Portal patient name"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-background/70 px-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
                />
              </label>
            ) : (
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Display name (optional)</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How this user appears in portal"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-background/70 px-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
                />
              </label>
            )}

            <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                New accounts are created directly inside your current organization context.
              </div>
              <button
                type="submit"
                disabled={createUserMutation.isPending}
                className="btn-shimmer inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-70"
              >
                <UserPlus2 className="h-4 w-4" strokeWidth={1.8} />
                {createUserMutation.isPending ? "Creating..." : "Add User"}
              </button>
            </div>

            {error ? (
              <div className="md:col-span-2 rounded-2xl border border-amber/20 bg-amber/[0.08] px-4 py-3 text-sm text-amber-100">
                {error}
              </div>
            ) : null}
          </form>
        </div>
      </Panel>

      <Panel
        title="Organization Users"
        eyebrow="Access Directory"
        description="Review the current roster, shift a person’s role, or suspend access without losing audit continuity."
        className="mt-4"
      >
        <div className="space-y-4 lg:hidden">
          {rows.map((typed) => {
            const isSelf = typed.id === authUser?.id;
            const suspended = Boolean(typed.isSuspended);
            const display = String(typed.displayName || typed.email || "");
            const avatarUrl = resolveApiAssetUrl(String(typed.avatarUrl || ""));

            return (
              <div key={typed.id as string} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-semibold tracking-[-0.02em] text-foreground">
                      {display}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{typed.email as string}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {formatRole(String(typed.role))}
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${
                          suspended
                            ? "border-amber/20 bg-amber/[0.08] text-amber-100"
                            : "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-200"
                        }`}
                      >
                        {suspended ? "Suspended" : "Active"}
                      </span>
                      {isSelf ? (
                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium text-foreground/80">
                          You
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={display}
                      className="h-10 w-10 shrink-0 rounded-2xl border border-white/10 object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-muted-foreground">
                      <span className="text-xs font-semibold">{initials(display || String(typed.email || "U"))}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <select
                    value={typed.role as string}
                    disabled={isSelf || updateRoleMutation.isPending}
                    onChange={(e) =>
                      updateRoleMutation.mutate({
                        userId: typed.id as string,
                        nextRole: e.target.value as Role,
                      })
                    }
                    className="h-11 rounded-2xl border border-white/10 bg-background/70 px-4 text-sm text-foreground outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {formatRole(r)}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={isSelf || suspendMutation.isPending}
                    onClick={() =>
                      suspendMutation.mutate({
                        userId: typed.id as string,
                        suspended: !suspended,
                      })
                    }
                    className="h-11 rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm font-medium text-foreground transition-colors hover:border-primary/30 disabled:opacity-60"
                  >
                    {suspended ? "Restore access" : "Suspend access"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden overflow-hidden rounded-[24px] border border-white/8 lg:block">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="px-5 py-4 font-medium">Account</th>
                <th className="px-5 py-4 font-medium">Role</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((typed) => {
                const isSelf = typed.id === authUser?.id;
                const suspended = Boolean(typed.isSuspended);
                const display = String(typed.displayName || typed.email || "");
                const avatarUrl = resolveApiAssetUrl(String(typed.avatarUrl || ""));

                return (
                  <tr key={typed.id as string} className="border-t border-white/6 bg-white/[0.015]">
                    <td className="px-5 py-4 align-top">
                      <div className="flex items-start gap-3">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={display}
                            className="h-12 w-12 shrink-0 rounded-2xl border border-white/10 object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-primary">
                            <span className="text-sm font-semibold">{initials(display || String(typed.email || "U"))}</span>
                          </div>
                        )}
                        <div>
                          <p className="font-display text-base font-semibold tracking-[-0.02em] text-foreground">
                            {display}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{typed.email as string}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {isSelf ? (
                              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-medium text-foreground/80">
                                Current session
                              </span>
                            ) : null}
                            {typed.patientProfileId ? (
                              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                                Patient-linked
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <select
                        value={typed.role as string}
                        disabled={isSelf || updateRoleMutation.isPending}
                        onChange={(e) =>
                          updateRoleMutation.mutate({
                            userId: typed.id as string,
                            nextRole: e.target.value as Role,
                          })
                        }
                        className="h-11 min-w-[12rem] rounded-2xl border border-white/10 bg-background/70 px-4 text-sm text-foreground outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {formatRole(r)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${
                          suspended
                            ? "border-amber/20 bg-amber/[0.08] text-amber-100"
                            : "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-200"
                        }`}
                      >
                        {suspended ? "Suspended" : "Active"}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <button
                        disabled={isSelf || suspendMutation.isPending}
                        onClick={() =>
                          suspendMutation.mutate({
                            userId: typed.id as string,
                            suspended: !suspended,
                          })
                        }
                        className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/30 disabled:opacity-60"
                      >
                        {suspended ? "Restore access" : "Suspend access"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && !users.isLoading ? (
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <Users2 className="h-6 w-6" strokeWidth={1.8} />
            </div>
            <h3 className="mt-4 font-display text-2xl font-semibold tracking-[-0.03em] text-foreground">
              No users created yet
            </h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Start by provisioning the first operational accounts for your organization. The directory will appear here with role controls and access status.
            </p>
          </div>
        ) : null}

        {users.isLoading ? <p className="text-sm text-muted-foreground">Loading user directory...</p> : null}
        {users.isError ? <p className="text-sm text-secondary">Unable to load organization users.</p> : null}
      </Panel>
    </PortalShell>
  );
}
