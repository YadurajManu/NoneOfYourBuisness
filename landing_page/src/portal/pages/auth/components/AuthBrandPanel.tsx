import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  FileText,
  HeartHandshake,
  Lock,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

const trustPoints = [
  {
    icon: Activity,
    title: "10-stage care lifecycle",
    body: "Referral to longitudinal care with audit trail on every transition.",
  },
  {
    icon: Stethoscope,
    title: "Role-aware workspaces",
    body: "Doctors, specialists, patients, and families see only what they need.",
  },
  {
    icon: HeartHandshake,
    title: "Consent-first family access",
    body: "Shared updates without giving away clinical control.",
  },
  {
    icon: FileText,
    title: "Document intelligence",
    body: "Reports and scans become searchable clinical context.",
  },
];

const ease = [0.16, 1, 0.3, 1] as const;

export function AuthBrandPanel() {
  return (
    <aside className="relative hidden min-h-screen overflow-hidden border-r border-white/[0.06] bg-obsidian-900 lg:flex lg:w-[46%] xl:w-[48%] lg:flex-col">
      {/* Subtle clinical grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
      {/* Soft teal wash */}
      <div className="pointer-events-none absolute -left-24 top-1/4 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(0,196,180,0.14)_0%,transparent_68%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(0,196,180,0.08)_0%,transparent_70%)]" />
      {/* Faint ECG line decoration */}
      <svg
        className="pointer-events-none absolute bottom-[18%] left-0 right-0 h-16 w-full opacity-[0.12]"
        viewBox="0 0 800 80"
        fill="none"
        aria-hidden
      >
        <path
          d="M0 40 H120 L140 40 L155 12 L175 68 L195 40 H280 L300 40 L315 22 L340 58 L360 40 H800"
          stroke="var(--brand-accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="relative z-10 flex h-full flex-col px-10 py-10 xl:px-14 xl:py-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease }}
        >
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
              <Activity className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <span className="font-display text-xl font-bold tracking-tight text-foreground">
              Aarogya<span className="text-[var(--brand-accent)]">360</span>
            </span>
          </Link>
        </motion.div>

        <div className="mt-auto max-w-md pb-4 pt-16">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05, ease }}
            className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-primary/90"
          >
            Clinical operations platform
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease }}
            className="font-display text-[2rem] font-bold leading-[1.15] tracking-[-0.03em] text-foreground xl:text-[2.35rem]"
          >
            Continuity of care,
            <br />
            <span className="text-foreground/85">one shared record.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16, ease }}
            className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted-foreground"
          >
            Built for clinics that refuse lost handoffs — from referral intake
            through longitudinal follow-up.
          </motion.p>

          <ul className="mt-10 space-y-5">
            {trustPoints.map((item, i) => (
              <motion.li
                key={item.title}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.06, ease }}
                className="flex gap-3.5"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-primary">
                  <item.icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground/95">{item.title}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="mt-12 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.06] pt-6 text-[12px] text-muted-foreground"
        >
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-primary/80" />
            Encrypted in transit
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary/80" />
            Role-based access
          </span>
          <span className="text-foreground/35">·</span>
          <span>Aarogya360 secure workspace</span>
        </motion.div>
      </div>
    </aside>
  );
}
