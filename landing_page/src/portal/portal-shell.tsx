import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  ActivitySquare,
  BookOpenText,
  BriefcaseMedical,
  ChevronRight,
  HeartHandshake,
  LayoutDashboard,
  ListChecks,
  Sparkles,
  Stethoscope,
  UserCircle2,
  UserRound,
  UserRoundCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/lib/api/types";
import { resolveApiAssetUrl } from "@/lib/api/client";
import { useAuth } from "@/portal/auth-context";

type NavItem = {
  to: string;
  label: string;
  hint: string;
  icon: LucideIcon;
};

const navByRole: Record<UserRole, NavItem[]> = {
  ADMIN: [
    { to: "/portal/admin", label: "Overview", hint: "Operations pulse", icon: LayoutDashboard },
    { to: "/portal/admin/patients", label: "Patients", hint: "Intake and staffing", icon: UserRound },
    { to: "/portal/admin/leads", label: "Leads", hint: "Inbound pipeline", icon: Sparkles },
    { to: "/portal/admin/users", label: "Users", hint: "Access control", icon: UserRoundCog },
  ],
  DOCTOR: [
    { to: "/portal/doctor", label: "Dashboard", hint: "Clinical overview", icon: Stethoscope },
    { to: "/portal/doctor/caseload", label: "Caseload", hint: "Patients in motion", icon: BriefcaseMedical },
  ],
  SPECIALIST: [
    { to: "/portal/specialist", label: "Dashboard", hint: "Specialist view", icon: ActivitySquare },
    { to: "/portal/specialist/caseload", label: "Caseload", hint: "Referred work", icon: ListChecks },
  ],
  PATIENT: [
    { to: "/portal/patient", label: "My Profile", hint: "Care journey", icon: LayoutDashboard },
    { to: "/portal/patient/family-access", label: "Family Access", hint: "Consent controls", icon: HeartHandshake },
  ],
  FAMILY_MEMBER: [
    { to: "/portal/family", label: "My Patients", hint: "Shared visibility", icon: Users },
    { to: "/portal/family/questions", label: "Questions", hint: "Care team requests", icon: HeartHandshake },
  ],
};

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Operations Admin",
  DOCTOR: "Primary Doctor",
  SPECIALIST: "Specialist",
  PATIENT: "Patient",
  FAMILY_MEMBER: "Family Member",
};

const helpNavItem: NavItem = {
  to: "/portal/help",
  label: "Help",
  hint: "Role guide and workflows",
  icon: BookOpenText,
};

const profileNavItem: NavItem = {
  to: "/portal/profile",
  label: "Profile",
  hint: "Photo and ID card",
  icon: UserCircle2,
};

export function PortalShell({ title, children }: { title: string; children: ReactNode }) {
  const { user, signOut } = useAuth();

  if (!user) return null;

  const items = [...(navByRole[user.role] || []), profileNavItem, helpNavItem];
  const avatarUrl = resolveApiAssetUrl(user.avatarUrl || "");
  const initials = (user.displayName || user.email || "U")
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background pt-20 text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10rem] top-[-6rem] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(0,212,200,0.18),transparent_62%)] blur-3xl" />
        <div className="absolute right-[-8rem] top-24 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.12),transparent_68%)] blur-3xl" />
        <div className="absolute bottom-[-10rem] left-1/3 h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle,rgba(0,212,200,0.08),transparent_65%)] blur-3xl" />
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "72px 72px" }} />
      </div>

      <header className="fixed left-0 right-0 top-0 z-50 h-20 border-b border-white/8 bg-[rgba(8,15,25,0.72)] backdrop-blur-2xl">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          <Link to="/" className="font-display text-xl font-bold tracking-tight">
            Aarogya<span className="text-primary">360</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 md:flex">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user.displayName || user.email}
                  className="h-8 w-8 rounded-full border border-white/15 object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-primary/12 text-[11px] font-semibold text-primary">
                  {initials || "U"}
                </div>
              )}
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-[0.26em] text-muted-foreground">
                  {roleLabels[user.role]}
                </p>
                <p className="max-w-[16rem] truncate text-xs text-foreground/90">
                  {user.displayName || user.email}
                </p>
                <p className="max-w-[16rem] truncate text-[11px] text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => void signOut()}
              className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-sm transition-all hover:border-primary/40 hover:bg-white/[0.06]"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-[300px_1fr]">
        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <div className="overflow-hidden rounded-[32px] border border-white/8 bg-[linear-gradient(180deg,rgba(17,27,39,0.98),rgba(10,17,27,0.98))] shadow-[var(--shadow-clinical)]">
            <div className="border-b border-white/8 px-5 py-5">
              <p className="text-[10px] uppercase tracking-[0.28em] text-primary/70">Portal</p>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-[-0.04em] text-foreground">
                {roleLabels[user.role]}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Shared patient operations styled with the same Aarogya360 visual system as the landing experience.
              </p>
            </div>

            <nav className="space-y-2 px-4 py-4">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `group block rounded-2xl border px-4 py-3 transition-all ${
                    isActive
                      ? "border-primary/25 bg-primary/[0.12] text-foreground shadow-[0_0_0_1px_rgba(0,212,200,0.08),0_18px_30px_-20px_rgba(0,212,200,0.45)]"
                      : "border-transparent text-muted-foreground hover:border-white/10 hover:bg-white/[0.04] hover:text-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                        isActive
                          ? "border-primary/25 bg-primary/15 text-primary"
                          : "border-white/10 bg-white/[0.03] text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      <item.icon className="h-4 w-4" strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-base font-semibold tracking-[-0.02em] text-inherit">
                        {item.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.hint}</p>
                    </div>
                    <ChevronRight
                      className={`h-4 w-4 shrink-0 transition-transform ${isActive ? "translate-x-0 text-primary" : "text-muted-foreground/60 group-hover:translate-x-0.5"}`}
                      strokeWidth={1.8}
                    />
                  </div>
                )}
              </NavLink>
            ))}
            </nav>

            <div className="border-t border-white/8 px-5 py-5">
              <div className="rounded-3xl border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Session</p>
                <p className="mt-3 text-sm font-medium text-foreground/90">{user.organization}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Role-aware access and portal navigation stay scoped to your organization context.
                </p>
              </div>
            </div>
          </div>
        </aside>

        <section>
          <div className="mb-6 rounded-[32px] border border-white/8 bg-[linear-gradient(180deg,rgba(17,27,39,0.92),rgba(12,20,31,0.88))] px-6 py-6 shadow-[var(--shadow-clinical)] sm:px-7">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-primary/70">Connected Portal</p>
                <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold tracking-[-0.05em] text-foreground sm:text-5xl">
                  {title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
                  A care operations workspace that mirrors the landing brand language while keeping role-based workflows readable under pressure.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:w-auto sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Mode</p>
                  <p className="mt-2 font-display text-lg font-semibold text-foreground">Live Portal</p>
                </div>
                <div className="rounded-2xl border border-primary/20 bg-primary/[0.08] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-primary/70">Access</p>
                  <p className="mt-2 font-display text-lg font-semibold text-foreground">{roleLabels[user.role]}</p>
                </div>
              </div>
            </div>
          </div>
          {children}
        </section>
      </div>
    </div>
  );
}
