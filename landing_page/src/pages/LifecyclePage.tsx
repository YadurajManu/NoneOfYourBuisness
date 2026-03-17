import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  UserPlus, Activity, Microscope, ClipboardCheck, Users, Pill,
  Monitor, Stethoscope, FileOutput, HeartPulse,
} from "lucide-react";
import { Section, FadeUp } from "@/components/shared";

const stages = [
  {
    num: 1, name: "Registration & Profile Creation", icon: UserPlus,
    desc: "Patient enters the system. Demographics, insurance, medical history, and emergency contacts are captured into a unified digital profile.",
    roles: ["Patient", "Family", "Doctor"],
  },
  {
    num: 2, name: "Initial Clinical Assessment", icon: Activity,
    desc: "Triage, vitals, and preliminary evaluations. AI pre-populates relevant fields from historical data and flags anomalies.",
    roles: ["Doctor", "AI"],
  },
  {
    num: 3, name: "Diagnostic Investigation", icon: Microscope,
    desc: "Lab orders, imaging requests, and diagnostic tests converge into a unified view. Results are auto-classified and routed.",
    roles: ["Doctor", "Specialist", "AI"],
  },
  {
    num: 4, name: "Diagnosis Confirmation & Care Plan", icon: ClipboardCheck,
    desc: "Evidence-based diagnosis with a structured care plan. Medication management, therapy schedules, and milestone tracking.",
    roles: ["Doctor", "Specialist", "Patient", "Family"],
  },
  {
    num: 5, name: "Specialist Referral & MDT Engagement", icon: Users,
    desc: "One-click referrals with full clinical context. Multi-disciplinary team collaboration with shared notes and action items.",
    roles: ["Doctor", "Specialist", "AI"],
  },
  {
    num: 6, name: "Active Treatment Delivery", icon: Pill,
    desc: "Medication administration, therapy sessions, and interventions tracked in real-time. Family receives automated status updates.",
    roles: ["Doctor", "Patient", "Family", "AI"],
  },
  {
    num: 7, name: "Inpatient Monitoring & Ward Management", icon: Monitor,
    desc: "Continuous vitals monitoring with AI anomaly detection. Automated nursing alerts and ward-level dashboards.",
    roles: ["Doctor", "AI"],
  },
  {
    num: 8, name: "Procedure Management", icon: Stethoscope,
    desc: "Surgical or procedural documentation with real-time status updates to family and the full care team.",
    roles: ["Doctor", "Specialist", "Patient", "Family"],
  },
  {
    num: 9, name: "Discharge Planning & Transition", icon: FileOutput,
    desc: "AI-generated discharge summaries, medication reconciliation, home care instructions, and follow-up scheduling.",
    roles: ["Doctor", "Patient", "Family", "AI"],
  },
  {
    num: 10, name: "Post-Discharge Monitoring & Closure", icon: HeartPulse,
    desc: "Automated follow-up reminders, outcome tracking, chronic disease management, and preventive care triggers.",
    roles: ["Patient", "Family", "Doctor", "AI"],
  },
];

const roleColors: Record<string, string> = {
  Patient: "bg-primary/10 text-primary border-primary/20",
  Family: "bg-secondary/10 text-secondary border-secondary/20",
  Doctor: "bg-foreground/10 text-foreground border-foreground/10",
  Specialist: "bg-accent text-accent-foreground border-foreground/10",
  AI: "bg-primary/20 text-primary border-primary/30",
};

export default function LifecyclePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const [activeStage, setActiveStage] = useState(0);

  // Track which stage is in view
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    stages.forEach((_, i) => {
      const el = document.getElementById(`lifecycle-stage-${i}`);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveStage(i); },
        { threshold: 0.5 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <div className="bg-background pt-24" ref={containerRef}>
      <Section>
        <FadeUp>
          <h1 className="text-4xl lg:text-6xl font-display font-bold tracking-[-0.04em] leading-[0.95] text-foreground mb-4">
            The 10-Stage Care Journey,
            <br />
            <span className="text-gradient-teal">Mapped.</span>
          </h1>
          <p className="text-lg text-muted-foreground font-body max-w-2xl">
            Every stage of the patient lifecycle — from registration to long-term
            monitoring — structured, connected, and intelligent.
          </p>
        </FadeUp>
      </Section>

      <section className="relative px-6 pb-24">
        <div className="max-w-7xl mx-auto">
          {/* Sticky progress indicator - desktop only */}
          <div className="hidden xl:block fixed right-8 top-1/2 -translate-y-1/2 z-40">
            <div className="flex flex-col items-center gap-2">
              {stages.map((s, i) => (
                <button
                  key={i}
                  onClick={() => document.getElementById(`lifecycle-stage-${i}`)?.scrollIntoView({ behavior: "smooth" })}
                  className={`w-8 h-8 rounded-full text-xs font-body font-semibold flex items-center justify-center transition-all duration-300 ${
                    activeStage === i
                      ? "bg-primary text-primary-foreground scale-110"
                      : "bg-card border border-foreground/10 text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {s.num}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Background line */}
            <div className="absolute left-6 lg:left-12 top-0 bottom-0 w-px bg-foreground/5" />
            {/* Animated teal line */}
            <motion.div
              className="absolute left-6 lg:left-12 top-0 w-px bg-primary"
              style={{ height: lineHeight, boxShadow: "0 0 10px rgba(0,212,200,0.4), 0 0 20px rgba(0,212,200,0.2)" }}
            />

            <div className="space-y-24">
              {stages.map((stage, i) => (
                <FadeUp key={stage.num} delay={0.05}>
                  <div id={`lifecycle-stage-${i}`} className="relative pl-20 lg:pl-28">
                    {/* Node */}
                    <div className="absolute left-3 lg:left-9 w-7 h-7 rounded-full bg-card border-2 border-primary/40 flex items-center justify-center z-10">
                      <stage.icon className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                    </div>

                    {/* Stage number ghost */}
                    <span className="text-8xl font-display font-bold text-primary/5 absolute -top-4 right-0 select-none hidden md:block">
                      {String(stage.num).padStart(2, "0")}
                    </span>

                    <div className="relative">
                      <span className="text-xs text-muted-foreground font-body uppercase tracking-widest">
                        Stage {stage.num}
                      </span>
                      <h2 className="text-2xl lg:text-3xl font-display font-bold text-foreground tracking-[-0.03em] mt-1 mb-3">
                        {stage.name}
                      </h2>
                      <p className="text-muted-foreground font-body leading-relaxed max-w-2xl mb-4">
                        {stage.desc}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {stage.roles.map((role) => (
                          <span
                            key={role}
                            className={`px-3 py-1 rounded-full text-xs font-body border ${roleColors[role] || "bg-accent text-foreground border-foreground/10"}`}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
