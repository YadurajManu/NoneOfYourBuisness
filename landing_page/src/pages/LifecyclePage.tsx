import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Activity,
  BellRing,
  Bot,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileOutput,
  HeartPulse,
  Microscope,
  Monitor,
  Pill,
  ShieldCheck,
  Stethoscope,
  UserPlus,
  Users,
} from "lucide-react";
import { Section, FadeUp, ClinicalCard } from "@/components/shared";

const stages = [
  {
    num: 1,
    title: "Patient Profile Created",
    label: "Registration",
    icon: UserPlus,
    desc: "Demographics, insurance, medical history, emergency contacts, and consent details are captured into one longitudinal profile.",
    roles: ["Patient", "Family", "Doctor"],
    aiAction: "Duplicates, missing fields, and prior records are detected before the first clinical handoff.",
    artifact: "Unified profile",
    outcome: "Clean intake packet ready for assessment.",
    metric: "92%",
    metricLabel: "intake fields structured",
    checklist: ["Identity verified", "Family access invited", "Record merged"],
  },
  {
    num: 2,
    title: "Clinical Intake Completed",
    label: "Assessment",
    icon: Activity,
    desc: "Triage, vitals, history, allergies, and preliminary evaluation are organized into a physician-ready assessment view.",
    roles: ["Doctor", "AI"],
    aiAction: "Relevant history is summarized and abnormal values are flagged for review.",
    artifact: "Vitals panel",
    outcome: "Care team sees what changed before they enter the room.",
    metric: "6 min",
    metricLabel: "faster chart review",
    checklist: ["Vitals captured", "Risks highlighted", "Doctor notified"],
  },
  {
    num: 3,
    title: "Diagnostics Ordered & Routed",
    label: "Diagnostics",
    icon: Microscope,
    desc: "Lab orders, imaging requests, and diagnostic results converge into a single routed workflow.",
    roles: ["Doctor", "Specialist", "AI"],
    aiAction: "Results are classified, routed, and attached to the relevant diagnosis thread.",
    artifact: "Lab order queue",
    outcome: "No result waits unseen in a disconnected system.",
    metric: "3",
    metricLabel: "active result routes",
    checklist: ["Labs ordered", "Imaging routed", "Results classified"],
  },
  {
    num: 4,
    title: "Care Plan Confirmed",
    label: "Diagnosis",
    icon: ClipboardCheck,
    desc: "Diagnosis, medication plan, procedures, milestones, and patient instructions are consolidated into a shared care plan.",
    roles: ["Doctor", "Specialist", "Patient", "Family"],
    aiAction: "Medication conflicts and missing plan steps are surfaced before confirmation.",
    artifact: "Care plan board",
    outcome: "Everyone works from the same physician-approved plan.",
    metric: "10",
    metricLabel: "plan tasks synced",
    checklist: ["Diagnosis confirmed", "Plan approved", "Milestones assigned"],
  },
  {
    num: 5,
    title: "Specialist Referral Activated",
    label: "Referral",
    icon: Users,
    desc: "Specialist referrals move with full clinical context, shared notes, attachments, and next-step ownership.",
    roles: ["Doctor", "Specialist", "AI"],
    aiAction: "The referral brief is generated from the latest clinical context and sent with the handoff.",
    artifact: "Referral brief",
    outcome: "Specialists start with context, not scattered PDFs.",
    metric: "1",
    metricLabel: "handoff packet",
    checklist: ["Specialist selected", "Context attached", "Owner assigned"],
  },
  {
    num: 6,
    title: "Treatment Delivery Tracked",
    label: "Treatment",
    icon: Pill,
    desc: "Medication administration, therapies, interventions, and daily care tasks are tracked against the active plan.",
    roles: ["Doctor", "Patient", "Family", "AI"],
    aiAction: "Delays and incomplete care tasks trigger role-appropriate alerts.",
    artifact: "Treatment tracker",
    outcome: "Teams know what was done, missed, or delayed.",
    metric: "24/7",
    metricLabel: "task visibility",
    checklist: ["Medication logged", "Therapy tracked", "Family updated"],
  },
  {
    num: 7,
    title: "Ward Monitoring Live",
    label: "Monitoring",
    icon: Monitor,
    desc: "Vitals, ward notes, risk events, and status changes are monitored through real-time operational dashboards.",
    roles: ["Doctor", "AI"],
    aiAction: "Anomaly detection prioritizes alerts by urgency and care-team ownership.",
    artifact: "Ward dashboard",
    outcome: "Critical changes are escalated before they disappear in noise.",
    metric: "4",
    metricLabel: "priority alerts",
    checklist: ["Vitals streaming", "Alerts triaged", "Escalation ready"],
  },
  {
    num: 8,
    title: "Procedure Status Shared",
    label: "Procedure",
    icon: Stethoscope,
    desc: "Procedure milestones, operative notes, and status updates are shared with the right clinical and family audiences.",
    roles: ["Doctor", "Specialist", "Patient", "Family"],
    aiAction: "Clinical notes are structured while plain-language family updates stay separate.",
    artifact: "Procedure timeline",
    outcome: "Families get clarity without interrupting the care team.",
    metric: "58%",
    metricLabel: "fewer status calls",
    checklist: ["Procedure started", "Team updated", "Family notified"],
  },
  {
    num: 9,
    title: "Discharge Plan Released",
    label: "Discharge",
    icon: FileOutput,
    desc: "Discharge summaries, medication reconciliation, home-care instructions, and follow-up scheduling are generated from the complete record.",
    roles: ["Doctor", "Patient", "Family", "AI"],
    aiAction: "A physician-reviewable discharge summary is drafted with pending tasks and follow-up gaps.",
    artifact: "Discharge packet",
    outcome: "Patients leave with instructions the full care circle can understand.",
    metric: "12%",
    metricLabel: "fewer readmissions",
    checklist: ["Summary drafted", "Meds reconciled", "Follow-up booked"],
  },
  {
    num: 10,
    title: "Follow-up Loop Closed",
    label: "Long-term care",
    icon: HeartPulse,
    desc: "Recovery, chronic care, reminders, outcomes, and preventive triggers continue after discharge.",
    roles: ["Patient", "Family", "Doctor", "AI"],
    aiAction: "Missed follow-ups, symptom changes, and chronic-care gaps are surfaced automatically.",
    artifact: "Follow-up queue",
    outcome: "Care continues beyond the hospital wall.",
    metric: "41%",
    metricLabel: "fewer missed follow-ups",
    checklist: ["Reminder sent", "Outcome captured", "Care loop closed"],
  },
];

const roleStyles: Record<string, string> = {
  Patient: "bg-primary/10 text-primary border-primary/20",
  Family: "bg-amber-400/10 text-amber-200 border-amber-300/20",
  Doctor: "bg-slate-200/10 text-slate-100 border-slate-100/10",
  Specialist: "bg-sky-300/10 text-sky-200 border-sky-300/20",
  AI: "bg-primary/15 text-primary border-primary/30",
};

const roleIcons: Record<string, typeof Users> = {
  Patient: HeartPulse,
  Family: Users,
  Doctor: Stethoscope,
  Specialist: Microscope,
  AI: Bot,
};

export default function LifecyclePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });
  const progressHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const glowOpacity = useTransform(scrollYProgress, [0, 0.35, 0.9], [0.1, 0.22, 0.08]);
  const [activeStage, setActiveStage] = useState(0);
  const active = stages[activeStage];
  const ActiveIcon = active.icon;

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    stages.forEach((_, index) => {
      const el = document.getElementById(`lifecycle-stage-${index}`);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveStage(index);
          }
        },
        {
          rootMargin: "-35% 0px -45% 0px",
          threshold: 0.1,
        }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((observer) => observer.disconnect());
  }, []);

  const scrollToStage = (index: number) => {
    document.getElementById(`lifecycle-stage-${index}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  return (
    <div className="bg-background pt-24" ref={containerRef}>
      <Section className="relative pb-10 lg:pb-12">
        <motion.div
          className="absolute left-1/2 top-8 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-primary blur-3xl"
          style={{ opacity: glowOpacity }}
        />

        <div className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-10 items-end">
          <FadeUp>
            <h1 className="text-4xl lg:text-6xl font-display font-bold tracking-[-0.04em] leading-[0.95] text-foreground mb-5">
              The 10-Stage Care Journey,
              <br />
              <span className="text-gradient-teal">Operationalized.</span>
            </h1>
            <p className="text-lg text-muted-foreground font-body max-w-2xl leading-relaxed">
              Follow one patient record as it moves from registration to
              post-discharge monitoring, with every handoff, role, and AI action
              visible in one connected workflow.
            </p>
          </FadeUp>

          <FadeUp delay={0.1}>
            <ClinicalCard className="p-6" hover={false}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-body uppercase tracking-widest text-muted-foreground">
                    Current stage
                  </p>
                  <p className="mt-1 text-2xl font-display font-bold text-foreground tabular-nums">
                    {String(active.num).padStart(2, "0")} / 10
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <ActiveIcon className="h-6 w-6" strokeWidth={1.5} />
                </div>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-foreground/5">
                <motion.div
                  className="h-full rounded-full bg-primary shadow-[0_0_18px_rgba(0,212,200,0.45)]"
                  animate={{ width: `${((activeStage + 1) / stages.length) * 100}%` }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <div className="mt-5 flex items-center gap-2 text-sm font-body text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" strokeWidth={1.5} />
                HIPAA-ready lifecycle visibility
              </div>
            </ClinicalCard>
          </FadeUp>
        </div>
      </Section>

      <section className="relative px-6 pb-24">
        <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_430px] gap-10">
          <div className="relative">
            <div className="sticky top-[73px] z-30 -mx-6 mb-12 bg-background/80 px-6 py-3 backdrop-blur-xl xl:hidden">
              <div className="no-scrollbar flex gap-2 overflow-x-auto">
                {stages.map((stage, index) => (
                  <button
                    key={stage.num}
                    onClick={() => scrollToStage(index)}
                    className={`flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-xs font-body font-semibold transition-all ${
                      activeStage === index
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-foreground/10 bg-card text-muted-foreground"
                    }`}
                  >
                    {stage.num}
                  </button>
                ))}
              </div>
            </div>

            <div className="absolute left-5 top-6 bottom-0 w-px bg-foreground/5 lg:left-8" />
            <motion.div
              className="absolute left-5 top-6 w-px bg-primary lg:left-8"
              style={{
                height: progressHeight,
                boxShadow: "0 0 14px rgba(0,212,200,0.5), 0 0 32px rgba(0,212,200,0.18)",
              }}
            />

            <div className="space-y-10 lg:space-y-14">
              {stages.map((stage, index) => {
                const Icon = stage.icon;
                const isActive = activeStage === index;

                return (
                  <motion.article
                    id={`lifecycle-stage-${index}`}
                    key={stage.num}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.45, delay: 0.03, ease: [0.16, 1, 0.3, 1] }}
                    className="relative min-h-[300px] pl-16 lg:pl-24"
                  >
                    <button
                      onClick={() => scrollToStage(index)}
                      className={`absolute left-0 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full border transition-all lg:left-3 ${
                        isActive
                          ? "border-primary bg-primary text-primary-foreground shadow-[0_0_24px_rgba(0,212,200,0.35)]"
                          : "border-primary/30 bg-card text-primary hover:border-primary"
                      }`}
                      aria-label={`Jump to stage ${stage.num}`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.7} />
                    </button>

                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_170px] gap-6">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs font-body uppercase tracking-widest text-primary">
                            Stage {stage.num}
                          </span>
                          <span className="rounded-full border border-foreground/10 bg-accent/70 px-3 py-1 text-xs font-body text-muted-foreground">
                            {stage.label}
                          </span>
                        </div>

                        <h2 className="mt-4 text-3xl lg:text-4xl font-display font-bold tracking-[-0.035em] leading-tight text-foreground">
                          {stage.title}
                        </h2>
                        <p className="mt-4 max-w-2xl text-base font-body leading-relaxed text-muted-foreground">
                          {stage.desc}
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2">
                          {stage.roles.map((role) => {
                            const RoleIcon = roleIcons[role] || Users;
                            return (
                              <span
                                key={role}
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-body ${roleStyles[role]}`}
                              >
                                <RoleIcon className="h-3 w-3" strokeWidth={1.5} />
                                {role}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <div className="hidden lg:block">
                        <div className={`text-8xl font-display font-bold tabular-nums transition-colors ${
                          isActive ? "text-primary/20" : "text-primary/[0.045]"
                        }`}>
                          {String(stage.num).padStart(2, "0")}
                        </div>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </div>

          <aside className="xl:sticky xl:top-28 xl:mt-10 xl:self-start">
            <motion.div
              key={active.num}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <ClinicalCard className="overflow-hidden border-primary/10 p-0 shadow-[0_24px_70px_rgba(0,0,0,0.28)]" hover={false}>
                <div className="border-b border-foreground/5 bg-gradient-to-br from-card via-card to-primary/5 p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-body uppercase tracking-widest text-muted-foreground">
                        Live patient record
                      </p>
                      <h3 className="mt-2 text-2xl font-display font-bold tracking-[-0.03em] text-foreground">
                        {active.artifact}
                      </h3>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                      <ActiveIcon className="h-6 w-6" strokeWidth={1.5} />
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-[110px_1fr] gap-4">
                    <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
                      <p className="text-3xl font-display font-bold text-primary tabular-nums">
                        {active.metric}
                      </p>
                      <p className="mt-1 text-xs font-body leading-snug text-muted-foreground">
                        {active.metricLabel}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-foreground/5 bg-background/35 p-4">
                      <p className="text-xs font-body uppercase tracking-widest text-muted-foreground">
                        Outcome
                      </p>
                      <p className="mt-2 text-sm font-body leading-relaxed text-foreground/85">
                        {active.outcome}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5 p-6">
                  <div>
                    <div className="mb-3 flex items-center gap-2 text-sm font-body font-semibold text-foreground">
                      <Bot className="h-4 w-4 text-primary" strokeWidth={1.5} />
                      AI action
                    </div>
                    <p className="text-sm font-body leading-relaxed text-muted-foreground">
                      {active.aiAction}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {active.checklist.map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-3 rounded-xl border border-foreground/5 bg-accent/50 px-4 py-3"
                      >
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.5} />
                        <span className="text-sm font-body text-muted-foreground">{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-foreground/5 bg-background/35 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-body font-semibold text-foreground">
                        <BellRing className="h-4 w-4 text-primary" strokeWidth={1.5} />
                        Care team visibility
                      </div>
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-body text-primary">
                        Synced
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {active.roles.map((role) => (
                        <span
                          key={role}
                          className={`rounded-full border px-3 py-1 text-xs font-body ${roleStyles[role]}`}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border border-primary/10 bg-primary/[0.06] p-4">
                    <CalendarClock className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.5} />
                    <p className="text-sm font-body leading-relaxed text-muted-foreground">
                      Next action is automatically assigned before the record leaves this stage.
                    </p>
                  </div>
                </div>
              </ClinicalCard>
            </motion.div>

            <div className="mt-5 hidden xl:grid grid-cols-5 gap-2">
              {stages.map((stage, index) => (
                <button
                  key={stage.num}
                  onClick={() => scrollToStage(index)}
                  className={`h-10 rounded-full border text-xs font-body font-semibold transition-all ${
                    activeStage === index
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-foreground/10 bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                  title={stage.title}
                >
                  {stage.num}
                </button>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
