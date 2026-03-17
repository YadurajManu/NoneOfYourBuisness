import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Users, Stethoscope, Microscope, Bot,
  CheckCircle2, Shield, FileText, Clock, Activity, Pill,
  ClipboardList, UserCheck, Calendar,
} from "lucide-react";
import { Section, FadeUp, ClinicalCard } from "@/components/shared";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const roles = [
  {
    icon: Heart,
    name: "Patient",
    headline: "Your Health, Your Control",
    features: [
      "Real-time access to care plans and lab results",
      "Secure messaging with your care team",
      "Medication reminders and appointment scheduling",
      "Family-shared access with permissions",
    ],
  },
  {
    icon: Users,
    name: "Family",
    headline: "Stay Informed, Stay Connected",
    features: [
      "Plain-language health updates from care teams",
      "Automated status notifications for key events",
      "Direct messaging with primary physicians",
      "Shared care calendar and task tracking",
    ],
  },
  {
    icon: Stethoscope,
    name: "Primary Doctor",
    headline: "Complete Clinical Picture",
    features: [
      "AI-generated discharge and visit summaries",
      "Cross-specialty unified patient timeline",
      "Smart alerts for missed follow-ups and anomalies",
      "One-click referrals with full context transfer",
    ],
  },
  {
    icon: Microscope,
    name: "Specialist",
    headline: "Context Without the Phone Tag",
    features: [
      "Referral-specific views with relevant history only",
      "Collaborative notes with tagging and threading",
      "Automated pre-visit summary generation",
      "Integration with specialty-specific workflows",
    ],
  },
  {
    icon: Bot,
    name: "AI Assistant",
    headline: "Always Physician-Approved Intelligence",
    features: [
      "Continuous monitoring with anomaly detection",
      "Auto-generated clinical documents awaiting approval",
      "Smart triage alerts routed to the right provider",
      "Natural language Q&A for families and patients",
    ],
    badge: "Always Physician-Approved",
  },
];

const stages = [
  { num: 1, name: "Referral", icon: FileText, desc: "Patient enters the system via GP referral, self-referral, or emergency intake. All demographics and referral context captured." },
  { num: 2, name: "Intake & Registration", icon: ClipboardList, desc: "Insurance verification, consent forms, medical history collection. Digital intake eliminates paper bottlenecks." },
  { num: 3, name: "Initial Assessment", icon: Activity, desc: "Triage, vitals, preliminary evaluations. AI pre-populates relevant fields from historical data." },
  { num: 4, name: "Diagnosis", icon: Microscope, desc: "Lab results, imaging, specialist consultations converge into a unified diagnostic view." },
  { num: 5, name: "Treatment Planning", icon: Pill, desc: "Evidence-based care plans with medication management, therapy schedules, and milestone tracking." },
  { num: 6, name: "Procedure / Intervention", icon: Stethoscope, desc: "Surgical or procedural documentation with real-time status updates to family and care team." },
  { num: 7, name: "Recovery & Monitoring", icon: Heart, desc: "Post-procedure monitoring with AI anomaly detection and automated nursing alerts." },
  { num: 8, name: "Discharge Planning", icon: UserCheck, desc: "AI-generated discharge summaries, medication reconciliation, and home care instructions." },
  { num: 9, name: "Follow-up Coordination", icon: Calendar, desc: "Automated appointment scheduling, reminder sequences, and outcome tracking." },
  { num: 10, name: "Long-term Care", icon: Clock, desc: "Chronic disease management, preventive care reminders, and longitudinal health analytics." },
];

const sideNavItems = roles.map((r) => ({ id: r.name.toLowerCase().replace(/\s/g, "-"), label: r.name }));

export default function ProductPage() {
  const [activeRole, setActiveRole] = useState(0);

  return (
    <div className="bg-background pt-24">
      {/* Hero */}
      <Section>
        <FadeUp>
          <h1 className="text-4xl lg:text-6xl font-display font-bold tracking-[-0.04em] leading-[0.95] text-foreground mb-4">
            Five Perspectives.
            <br />
            <span className="text-gradient-teal">One Unified Platform.</span>
          </h1>
          <p className="text-lg text-muted-foreground font-body max-w-2xl">
            Every role in the care journey gets a purpose-built experience — connected by a single source of truth.
          </p>
        </FadeUp>
      </Section>

      {/* Role sections */}
      <Section>
        {/* Tab switcher */}
        <FadeUp>
          <div className="flex flex-wrap gap-2 mb-16">
            {roles.map((role, i) => (
              <button
                key={role.name}
                onClick={() => setActiveRole(i)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-body transition-all duration-300 ${
                  activeRole === i
                    ? "bg-primary/10 border border-primary/30 text-primary"
                    : "bg-card border border-foreground/5 text-muted-foreground hover:text-foreground"
                }`}
              >
                <role.icon className="w-4 h-4" strokeWidth={1.5} />
                {role.name}
              </button>
            ))}
          </div>
        </FadeUp>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeRole}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                {roles[activeRole].badge && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-body font-medium bg-secondary/10 text-secondary border border-secondary/20 mb-4">
                    <Shield className="w-3 h-3" strokeWidth={1.5} />
                    {roles[activeRole].badge}
                  </span>
                )}
                <h2 className="text-3xl font-display font-bold tracking-[-0.03em] text-foreground mb-2">
                  {roles[activeRole].headline}
                </h2>
                <p className="text-sm text-muted-foreground font-body mb-6">
                  The {roles[activeRole].name} experience
                </p>
                <ul className="space-y-4">
                  {roles[activeRole].features.map((f, i) => (
                    <motion.li
                      key={f}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-start gap-3"
                    >
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" strokeWidth={1.5} />
                      <span className="text-sm text-muted-foreground font-body">{f}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Mockup placeholder */}
              <ClinicalCard className="min-h-[320px] flex items-center justify-center" hover={false}>
                <div className="text-center">
                  {(() => {
                    const Icon = roles[activeRole].icon;
                    return <Icon className="w-16 h-16 text-primary/30 mx-auto mb-4" strokeWidth={1} />;
                  })()}
                  <p className="text-sm text-muted-foreground font-body">
                    {roles[activeRole].name} Dashboard Preview
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} className="h-8 rounded bg-foreground/5" />
                    ))}
                  </div>
                </div>
              </ClinicalCard>
            </div>
          </motion.div>
        </AnimatePresence>
      </Section>

      {/* 10-Stage Lifecycle Accordion */}
      <Section className="bg-card/30">
        <FadeUp>
          <h2 className="text-3xl lg:text-4xl font-display font-bold tracking-[-0.03em] text-foreground mb-4">
            The 10-Stage Lifecycle
          </h2>
          <p className="text-muted-foreground font-body max-w-2xl mb-12">
            Deep-dive into each stage of the patient journey.
          </p>
        </FadeUp>

        <Accordion type="single" collapsible className="space-y-3">
          {stages.map((stage) => (
            <FadeUp key={stage.num} delay={stage.num * 0.03}>
              <AccordionItem
                value={`stage-${stage.num}`}
                className="bg-card border border-foreground/5 rounded-xl overflow-hidden"
              >
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <stage.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                    </div>
                    <div className="text-left">
                      <span className="text-xs text-muted-foreground font-body">Stage {stage.num}</span>
                      <h3 className="font-display font-semibold text-foreground">{stage.name}</h3>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <p className="text-sm text-muted-foreground font-body leading-relaxed pl-14">{stage.desc}</p>
                </AccordionContent>
              </AccordionItem>
            </FadeUp>
          ))}
        </Accordion>
      </Section>
    </div>
  );
}
