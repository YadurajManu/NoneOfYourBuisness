import { motion } from "framer-motion";
import { Eye, Brain, ArrowRight, Sparkles, MapPin, Linkedin, Quote } from "lucide-react";
import { Section, FadeUp, ClinicalCard } from "@/components/shared";

const values = [
  { icon: Eye, title: "Transparency", desc: "Every stakeholder sees the truth of a patient's journey — no hidden data, no access barriers, no information asymmetry." },
  { icon: Brain, title: "Intelligence", desc: "AI that augments clinical judgment without replacing it. Every recommendation is traceable, explainable, and physician-approved." },
  { icon: ArrowRight, title: "Continuity", desc: "Care doesn't end at discharge. We track the full lifecycle from first referral to long-term follow-up and everything between." },
];


const milestones = [
  { year: "2024", event: "Founded in Dehradun by Yaduraj Singh" },
  { year: "2024 Q2", event: "First hospital partner onboarded" },
  { year: "2024 Q4", event: "SOC 2 Type II certification achieved" },
  { year: "2025 Q1", event: "HIPAA compliance & BAA framework launched" },
  { year: "2025 Q2", event: "1M patient records processed" },
  { year: "2025", event: "ISO 27001 certification" },
];

export default function AboutPage() {
  return (
    <div className="bg-background pt-24">
      {/* Hero */}
      <Section>
        <FadeUp>
          <h1 className="text-4xl lg:text-6xl font-display font-bold tracking-[-0.04em] leading-[0.95] text-foreground mb-6">
            Rethinking the Backbone<br />
            <span className="text-gradient-teal">of Patient Care</span>
          </h1>
          <p className="text-lg text-muted-foreground font-body max-w-2xl leading-relaxed">
            We don't build software — we build the connective tissue of modern
            medicine. Aarogya360 was founded on one belief: every patient
            deserves a care journey that's seamless, transparent, and intelligent
            from first referral to lifelong wellness.
          </p>
        </FadeUp>
      </Section>

      {/* Founder Section */}
      <Section className="bg-card/30">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <FadeUp>
            <p className="text-xs font-body uppercase tracking-widest text-primary mb-4">Our Founder</p>
            <h2 className="text-4xl lg:text-5xl font-display font-bold tracking-[-0.04em] leading-[0.95] text-foreground mb-2">
              Yaduraj Singh
            </h2>
            <p className="text-lg text-muted-foreground font-body">Founder & CEO, Aarogya360</p>
          </FadeUp>

          <FadeUp delay={0.1}>
            <p className="text-muted-foreground font-body leading-relaxed mb-6">
              Yaduraj Singh founded Aarogya360 with a singular mission — to eliminate
              the information fragmentation that costs lives in Indian healthcare. As
              a solo founder based in Dehradun, he is building the infrastructure
              layer that connects every stakeholder in the patient journey.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body bg-accent border border-foreground/5 text-muted-foreground">
                <MapPin className="w-3 h-3 text-primary" strokeWidth={1.5} />
                Dehradun, Uttarakhand
              </span>
              <a
                href="https://linkedin.com/in/yadurajsingh"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-body font-semibold border border-foreground/10 text-foreground hover:border-primary/30 transition-colors"
              >
                <Linkedin className="w-3 h-3" strokeWidth={1.5} />
                Connect with Founder
              </a>
            </div>

            {/* Quote */}
            <div className="relative border-l-2 border-primary/40 pl-6 py-2">
              <Quote className="absolute -left-3 -top-1 w-6 h-6 text-primary/20" strokeWidth={1.5} />
              <p className="text-sm text-foreground/80 font-body italic leading-relaxed">
                "I built Aarogya360 because I watched critical patient information
                get lost between doctors, families, and hospitals. That ends now."
              </p>
              <p className="mt-2 text-xs text-muted-foreground font-body">— Yaduraj Singh</p>
            </div>
          </FadeUp>
        </div>
      </Section>

      {/* Values */}
      <Section>
        <FadeUp>
          <h2 className="text-3xl font-display font-bold tracking-[-0.03em] text-foreground mb-12">Our Pillars</h2>
        </FadeUp>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {values.map((v, i) => (
            <FadeUp key={v.title} delay={i * 0.1}>
              <ClinicalCard>
                <v.icon className="w-10 h-10 text-primary mb-4" strokeWidth={1.5} />
                <h3 className="text-xl font-display font-bold text-foreground mb-2">{v.title}</h3>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">{v.desc}</p>
              </ClinicalCard>
            </FadeUp>
          ))}
        </div>
      </Section>


      {/* Timeline */}
      <Section>
        <FadeUp>
          <h2 className="text-3xl font-display font-bold tracking-[-0.03em] text-foreground mb-12">Our Journey</h2>
        </FadeUp>
        <div className="overflow-x-auto pb-4 -mx-6 px-6 snap-x snap-mandatory">
          <div className="flex gap-6 min-w-max">
            {milestones.map((m, i) => (
              <FadeUp key={m.year} delay={i * 0.08}>
                <div className="snap-start w-64 shrink-0">
                  <ClinicalCard className="h-full">
                    <span className="text-2xl font-display font-bold text-primary tabular-nums">{m.year}</span>
                    <p className="mt-3 text-sm text-muted-foreground font-body leading-relaxed">{m.event}</p>
                  </ClinicalCard>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}
