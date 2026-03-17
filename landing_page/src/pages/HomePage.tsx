import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Zap, Network, Brain, AlertTriangle, CheckCircle2, ChevronDown,
  Users, Heart, Stethoscope, Microscope, Bot, FileText, Clock,
  Activity, Pill, ClipboardList, UserCheck, Calendar,
} from "lucide-react";
import { Section, FadeUp, ClinicalCard } from "@/components/shared";

function useCounter(end: number, suffix = "", duration = 2000) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          setVal(Math.round(end * p));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [end, duration]);
  return { ref, display: `${val}${suffix}` };
}

const stats = [
  { end: 41, suffix: "%", label: "Reduction in missed follow-ups" },
  { end: 58, suffix: "%", label: "Drop in family call volume" },
  { end: 6, suffix: " min", label: "Discharge summary time (from 22 min)" },
  { end: 12, suffix: "%", label: "Fewer 30-day readmissions" },
];

const problems = [
  { icon: AlertTriangle, text: "Siloed records across departments and systems" },
  { icon: AlertTriangle, text: "Missed handoffs during care transitions" },
  { icon: AlertTriangle, text: "Overwhelmed care teams buried in admin work" },
];

const solutions = [
  { icon: CheckCircle2, text: "Unified patient record across every stakeholder" },
  { icon: CheckCircle2, text: "Automated handoff alerts at every transition" },
  { icon: CheckCircle2, text: "AI-powered documentation and summaries" },
];

const roles = [
  { icon: Heart, name: "Patient", desc: "Self-service portal with real-time health updates and care plan tracking." },
  { icon: Users, name: "Family", desc: "Transparent communication hub with plain-language updates from care teams." },
  { icon: Stethoscope, name: "Primary Doctor", desc: "Complete clinical dashboard with AI-assisted documentation and alerts." },
  { icon: Microscope, name: "Specialist", desc: "Role-specific views with referral context and collaborative notes." },
  { icon: Bot, name: "AI Assistant", desc: "Always physician-approved. Monitors, alerts, and generates clinical documents." },
];

const stages = [
  { num: 1, name: "Referral", icon: FileText },
  { num: 2, name: "Intake", icon: ClipboardList },
  { num: 3, name: "Assessment", icon: Activity },
  { num: 4, name: "Diagnosis", icon: Microscope },
  { num: 5, name: "Treatment Plan", icon: Pill },
  { num: 6, name: "Procedure", icon: Stethoscope },
  { num: 7, name: "Recovery", icon: Heart },
  { num: 8, name: "Discharge", icon: UserCheck },
  { num: 9, name: "Follow-up", icon: Calendar },
  { num: 10, name: "Long-term Care", icon: Clock },
];

const features = [
  { icon: Zap, title: "Document Intelligence", desc: "AI classification and summarization under 90 seconds. Reduce admin burden by 60%." },
  { icon: Network, title: "Integration-First", desc: "Connect to Epic, Cerner, and 40+ EHRs via HL7 FHIR R4. No rip-and-replace." },
  { icon: Brain, title: "Role-Appropriate AI", desc: "Clinical depth for doctors, plain language for families. Always physician-approved." },
];

const pills = ["HIPAA Compliant", "HL7 FHIR R4", "SOC 2 Type II"];

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const [activeRole, setActiveRole] = useState(0);

  return (
    <div className="bg-background">
      {/* HERO */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden px-6">
        <motion.div style={{ y: heroY }} className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-30 animate-float"
            style={{ background: "radial-gradient(circle, rgba(0,212,200,0.2) 0%, rgba(0,212,200,0.05) 40%, transparent 70%)" }} />
          <div className="absolute top-1/3 left-1/3 w-[600px] h-[600px] rounded-full opacity-20 animate-float"
            style={{ background: "radial-gradient(circle, rgba(13,27,42,0.8) 0%, transparent 70%)", animationDelay: "2s" }} />
        </motion.div>

        <motion.div style={{ opacity: heroOpacity }} className="relative z-10 max-w-5xl mx-auto text-center">
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold tracking-[-0.04em] leading-[0.95] text-foreground">
            One Record.<br />Every Stakeholder.<br />
            <span className="text-gradient-teal">Zero Gaps.</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto font-body leading-relaxed">
            Aarogya360 eliminates care fragmentation with a single real-time
            patient record — purpose-built for hospitals and multi-specialty clinics.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/contact" className="btn-shimmer px-8 py-3 rounded-full text-sm font-body font-semibold text-primary-foreground">
              Request a Demo
            </Link>
            <Link to="/product" className="px-8 py-3 rounded-full text-sm font-body font-semibold text-foreground border border-foreground/20 hover:border-primary/50 transition-colors">
              See How It Works
            </Link>
          </motion.div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {pills.map((pill, i) => (
              <motion.span key={pill} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
                className="px-4 py-1.5 rounded-full text-xs font-body font-medium bg-accent border border-foreground/10 text-muted-foreground">
                {pill}
              </motion.span>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <ChevronDown className="w-6 h-6 text-muted-foreground animate-bounce" strokeWidth={1.5} />
        </motion.div>
      </section>

      {/* SOCIAL PROOF */}
      <Section className="py-16 border-y border-foreground/5">
        <FadeUp>
          <p className="text-center text-xs font-body uppercase tracking-widest text-muted-foreground mb-8">
            Trusted by Leading Healthcare Institutions
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-40">
            {["Apollo Hospitals", "Fortis Healthcare", "Max Healthcare", "AIIMS", "Medanta"].map((name) => (
              <span key={name} className="font-display font-semibold text-lg text-foreground">{name}</span>
            ))}
          </div>
        </FadeUp>
      </Section>

      {/* STATS */}
      <Section>
        <FadeUp>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((s, i) => {
              const counter = useCounter(s.end, s.suffix);
              return (
                <ClinicalCard key={i}>
                  <div ref={counter.ref} className="text-4xl font-display font-bold text-primary glow-teal tabular-nums">
                    {counter.display}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground font-body">{s.label}</p>
                </ClinicalCard>
              );
            })}
          </div>
        </FadeUp>
      </Section>

      {/* PROBLEM → SOLUTION */}
      <Section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <FadeUp>
            <h2 className="text-3xl font-display font-bold tracking-[-0.03em] text-foreground mb-8">The Fragmentation Problem</h2>
            <div className="space-y-6">
              {problems.map((p, i) => (
                <div key={i} className="flex items-start gap-4">
                  <p.icon className="w-5 h-5 text-secondary mt-0.5 shrink-0" strokeWidth={1.5} />
                  <p className="text-muted-foreground font-body">{p.text}</p>
                </div>
              ))}
            </div>
          </FadeUp>
          <FadeUp delay={0.15}>
            <h2 className="text-3xl font-display font-bold tracking-[-0.03em] text-foreground mb-8">The Aarogya360 Solution</h2>
            <div className="space-y-6">
              {solutions.map((s, i) => (
                <div key={i} className="flex items-start gap-4">
                  <s.icon className="w-5 h-5 text-primary mt-0.5 shrink-0" strokeWidth={1.5} />
                  <p className="text-muted-foreground font-body">{s.text}</p>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </Section>

      {/* 5 USER EXPERIENCES */}
      <Section>
        <FadeUp>
          <h2 className="text-3xl lg:text-4xl font-display font-bold tracking-[-0.03em] text-foreground mb-4">
            One Platform. Five Intelligent Perspectives.
          </h2>
          <p className="text-muted-foreground font-body max-w-2xl mb-12">
            Every stakeholder sees exactly what they need — from clinical depth to plain-language updates.
          </p>
        </FadeUp>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {roles.map((role, i) => (
            <FadeUp key={role.name} delay={i * 0.05}>
              <ClinicalCard className={`cursor-pointer transition-all duration-300 ${activeRole === i ? "border-primary/40 border-glow-teal" : ""}`} hover>
                <div onClick={() => setActiveRole(i)}>
                  <role.icon className={`w-8 h-8 mb-4 ${activeRole === i ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
                  <h3 className="font-display font-semibold text-foreground mb-1">{role.name}</h3>
                  <p className="text-xs text-muted-foreground font-body leading-relaxed">{role.desc}</p>
                </div>
              </ClinicalCard>
            </FadeUp>
          ))}
        </div>
      </Section>

      {/* 10-STAGE LIFECYCLE */}
      <Section className="bg-card/50">
        <FadeUp>
          <h2 className="text-3xl lg:text-4xl font-display font-bold tracking-[-0.03em] text-foreground mb-4">
            The Complete Care Journey, Structured.
          </h2>
          <p className="text-muted-foreground font-body max-w-2xl mb-16">
            10 stages from referral to long-term follow-up — every transition tracked, every handoff automated.
          </p>
        </FadeUp>
        <div className="relative">
          <div className="absolute left-6 lg:left-1/2 top-0 bottom-0 w-px bg-foreground/10" />
          <div className="space-y-12">
            {stages.map((stage, i) => (
              <FadeUp key={stage.num} delay={i * 0.05}>
                <div className={`relative flex items-center gap-6 ${i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"}`}>
                  <div className={`flex-1 ${i % 2 === 0 ? "lg:text-right" : "lg:text-left"} hidden lg:block`}>
                    <h3 className="font-display font-semibold text-foreground">{stage.name}</h3>
                  </div>
                  <div className="relative z-10 w-12 h-12 rounded-full bg-card border-2 border-primary/30 flex items-center justify-center shrink-0">
                    <stage.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <span className="text-xs text-muted-foreground font-body">Stage {stage.num}</span>
                    <h3 className="font-display font-semibold text-foreground lg:hidden">{stage.name}</h3>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </Section>

      {/* FEATURE HIGHLIGHTS */}
      <Section>
        <FadeUp>
          <h2 className="text-3xl lg:text-4xl font-display font-bold tracking-[-0.03em] text-foreground mb-12 text-center">
            Built for the Future of Care
          </h2>
        </FadeUp>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <FadeUp key={f.title} delay={i * 0.1}>
              <ClinicalCard>
                <f.icon className="w-10 h-10 text-primary mb-4" strokeWidth={1.5} />
                <h3 className="text-xl font-display font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">{f.desc}</p>
              </ClinicalCard>
            </FadeUp>
          ))}
        </div>
      </Section>

      {/* FINAL CTA */}
      <Section>
        <FadeUp>
          <div className="relative rounded-3xl p-12 text-center overflow-hidden border border-primary/20 border-glow-teal">
            <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(ellipse at center, rgba(0,212,200,0.15) 0%, transparent 70%)" }} />
            <div className="relative z-10">
              <h2 className="text-3xl lg:text-4xl font-display font-bold tracking-[-0.03em] text-foreground mb-4">
                Ready to close the gaps in patient care?
              </h2>
              <p className="text-muted-foreground font-body mb-8 max-w-lg mx-auto">
                Join the hospitals and clinics already using Aarogya360 to deliver seamless, connected care.
              </p>
              <Link to="/contact" className="btn-shimmer inline-flex px-8 py-3 rounded-full text-sm font-body font-semibold text-primary-foreground">
                Request Demo
              </Link>
            </div>
          </div>
        </FadeUp>
      </Section>
    </div>
  );
}
