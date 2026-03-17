import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Section, FadeUp, ClinicalCard } from "@/components/shared";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const tiers = [
  {
    name: "Clinic",
    price: "$1.20",
    unit: "/ active patient / month",
    features: [
      "Up to 5,000 active patients",
      "All 10 lifecycle stages",
      "HL7 FHIR R4 integration",
      "AI document summaries",
      "Unlimited users",
      "Email support",
    ],
    cta: "Start Free Trial",
    featured: false,
  },
  {
    name: "Hospital",
    price: "$0.85",
    unit: "/ active patient / month",
    features: [
      "Unlimited active patients",
      "All 10 lifecycle stages",
      "Multi-EHR integration",
      "Advanced AI assistant",
      "Custom role permissions",
      "Dedicated success manager",
      "SLA & priority support",
    ],
    cta: "Start Free Trial",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    unit: "volume pricing",
    features: [
      "Multi-facility deployment",
      "On-premise option available",
      "Custom AI model training",
      "Advanced analytics & BI",
      "White-label available",
      "24/7 phone support",
      "Custom integrations",
    ],
    cta: "Contact Sales",
    featured: false,
  },
];

const faqs = [
  {
    q: "What counts as an 'active patient'?",
    a: "An active patient is any individual with at least one interaction (appointment, message, record update) within your billing period. Dormant records don't count.",
  },
  {
    q: "Are there any seat limits?",
    a: "No. All plans include unlimited users — doctors, nurses, specialists, admin staff, and family members.",
  },
  {
    q: "Can we switch plans mid-contract?",
    a: "Yes. You can upgrade at any time and your pricing adjusts pro-rata. Downgrades take effect at the next billing cycle.",
  },
  {
    q: "Is there a setup fee?",
    a: "No setup fees. We include implementation support and EHR integration at no additional cost for Hospital and Enterprise plans.",
  },
  {
    q: "Do you offer a free trial?",
    a: "Yes. All plans include a 30-day free trial with full feature access. No credit card required to start.",
  },
  {
    q: "What's included in all plans?",
    a: "Every plan includes HIPAA compliance, SOC 2 Type II certification, the AI assistant, unlimited seats, and core integrations.",
  },
];

const allIncludes = [
  "HIPAA & SOC 2 compliance",
  "AI Assistant",
  "HL7 FHIR R4",
  "Unlimited seats",
  "99.9% uptime SLA",
];

export default function PricingPage() {
  return (
    <div className="bg-background pt-24">
      <Section>
        <FadeUp>
          <h1 className="text-4xl lg:text-6xl font-display font-bold tracking-[-0.04em] leading-[0.95] text-foreground mb-4 text-center">
            Simple, Scalable,
            <br />
            <span className="text-gradient-teal">Aligned with Care.</span>
          </h1>
          <p className="text-lg text-muted-foreground font-body text-center max-w-xl mx-auto">
            Per active patient per month. No seat limits. No surprises.
          </p>
        </FadeUp>
      </Section>

      {/* Tier Cards */}
      <Section className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((tier, i) => (
            <FadeUp key={tier.name} delay={i * 0.1}>
              <ClinicalCard
                className={`flex flex-col ${
                  tier.featured ? "border-primary/30 border-glow-teal" : ""
                }`}
              >
                {tier.featured && (
                  <span className="inline-flex self-start px-3 py-1 rounded-full text-xs font-body font-medium bg-primary/10 text-primary border border-primary/20 mb-4">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-display font-bold text-foreground">{tier.name}</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-display font-bold text-foreground">{tier.price}</span>
                  <span className="text-sm text-muted-foreground font-body ml-2">{tier.unit}</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" strokeWidth={1.5} />
                      <span className="text-sm text-muted-foreground font-body">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/contact"
                  className={`text-center py-3 rounded-full text-sm font-body font-semibold transition-all ${
                    tier.featured
                      ? "btn-shimmer text-primary-foreground"
                      : "bg-card border border-foreground/10 text-foreground hover:border-primary/30"
                  }`}
                >
                  {tier.cta}
                </Link>
              </ClinicalCard>
            </FadeUp>
          ))}
        </div>

        {/* All plans include */}
        <FadeUp>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6">
            <span className="text-sm text-muted-foreground font-body">All plans include:</span>
            {allIncludes.map((item) => (
              <span
                key={item}
                className="px-3 py-1 rounded-full text-xs font-body bg-accent border border-foreground/5 text-muted-foreground"
              >
                {item}
              </span>
            ))}
          </div>
        </FadeUp>
      </Section>

      {/* FAQ */}
      <Section className="bg-card/30">
        <FadeUp>
          <h2 className="text-3xl font-display font-bold tracking-[-0.03em] text-foreground mb-12 text-center">
            Frequently Asked Questions
          </h2>
        </FadeUp>

        <div className="max-w-2xl mx-auto">
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <FadeUp key={i} delay={i * 0.05}>
                <AccordionItem
                  value={`faq-${i}`}
                  className="bg-card border border-foreground/5 rounded-xl overflow-hidden"
                >
                  <AccordionTrigger className="px-6 py-4 hover:no-underline text-left">
                    <span className="font-display font-semibold text-foreground">{faq.q}</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4">
                    <p className="text-sm text-muted-foreground font-body leading-relaxed">{faq.a}</p>
                  </AccordionContent>
                </AccordionItem>
              </FadeUp>
            ))}
          </Accordion>
        </div>
      </Section>
    </div>
  );
}
