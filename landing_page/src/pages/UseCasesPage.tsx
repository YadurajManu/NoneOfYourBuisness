import { Link } from "react-router-dom";
import { CheckCircle2, Building2, Stethoscope, Heart, Activity } from "lucide-react";
import { Section, FadeUp, ClinicalCard } from "@/components/shared";

const useCases = [
  {
    icon: Building2,
    title: "Multi-Specialty Hospitals",
    desc: "Managing complex MDT workflows across departments with unified patient records.",
    benefits: [
      "Cross-department patient timeline visible to all teams",
      "Automated referral routing with full clinical context",
      "AI-powered MDT meeting summaries and action items",
    ],
    stat: "41%",
    statLabel: "reduction in inter-department handoff errors",
  },
  {
    icon: Activity,
    title: "Small Clinics & Polyclinics",
    desc: "Affordable lifecycle management at scale for resource-conscious care settings.",
    benefits: [
      "Lightweight onboarding — live in under 48 hours",
      "Per-patient pricing with no seat limits",
      "Integrated billing and insurance verification",
    ],
    stat: "3x",
    statLabel: "faster patient intake vs paper-based systems",
  },
  {
    icon: Stethoscope,
    title: "Post-Surgical Recovery",
    desc: "Continuous monitoring and family communication during the critical recovery window.",
    benefits: [
      "Real-time post-op monitoring with AI anomaly detection",
      "Automated family status updates at key milestones",
      "Smart discharge readiness scoring",
    ],
    stat: "58%",
    statLabel: "drop in post-surgical family call volume",
  },
  {
    icon: Heart,
    title: "Chronic Disease Management",
    desc: "Long-term patient tracking, preventive alerts, and outcome analytics.",
    benefits: [
      "Longitudinal health dashboards for chronic conditions",
      "Automated medication adherence reminders",
      "Predictive alerts for condition deterioration",
    ],
    stat: "12%",
    statLabel: "fewer 30-day readmissions for chronic patients",
  },
];

export default function UseCasesPage() {
  return (
    <div className="bg-background pt-24">
      <Section>
        <FadeUp>
          <h1 className="text-4xl lg:text-6xl font-display font-bold tracking-[-0.04em] leading-[0.95] text-foreground mb-4">
            Built for Every
            <br />
            <span className="text-gradient-teal">Care Setting</span>
          </h1>
          <p className="text-lg text-muted-foreground font-body max-w-2xl">
            From large multi-specialty hospitals to neighborhood clinics — Aarogya360
            adapts to your workflow.
          </p>
        </FadeUp>
      </Section>

      <Section className="pt-0">
        <div className="space-y-16">
          {useCases.map((uc, i) => (
            <FadeUp key={uc.title} delay={0.1}>
              <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 items-center ${i % 2 !== 0 ? "lg:direction-rtl" : ""}`}>
                {/* Text side */}
                <div className={i % 2 !== 0 ? "lg:order-2" : ""}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <uc.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-2xl font-display font-bold text-foreground tracking-[-0.02em]">
                      {uc.title}
                    </h2>
                  </div>
                  <p className="text-muted-foreground font-body mb-6">{uc.desc}</p>
                  <ul className="space-y-3 mb-6">
                    {uc.benefits.map((b) => (
                      <li key={b} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" strokeWidth={1.5} />
                        <span className="text-sm text-muted-foreground font-body">{b}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/contact"
                    className="inline-flex px-6 py-2 rounded-full text-sm font-body font-semibold border border-foreground/10 text-foreground hover:border-primary/30 transition-colors">
                    Learn More
                  </Link>
                </div>

                {/* Stat card side */}
                <div className={i % 2 !== 0 ? "lg:order-1" : ""}>
                  <ClinicalCard className="flex flex-col items-center justify-center min-h-[240px] text-center">
                    <span className="text-6xl font-display font-bold text-primary glow-teal tabular-nums">
                      {uc.stat}
                    </span>
                    <p className="mt-3 text-sm text-muted-foreground font-body max-w-xs">{uc.statLabel}</p>
                  </ClinicalCard>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </Section>
    </div>
  );
}
