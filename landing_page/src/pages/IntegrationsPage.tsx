import { Shield, Lock, Server, ArrowRight } from "lucide-react";
import { Section, FadeUp, ClinicalCard } from "@/components/shared";

const ehrs = [
  "Epic", "Cerner", "Allscripts", "MEDITECH", "athenahealth",
  "eClinicalWorks", "NextGen", "GE Healthcare",
];

const protocols = [
  { name: "HL7 FHIR R4", desc: "Full interoperability with modern EHR systems" },
  { name: "HL7 v2", desc: "Legacy system support for older hospital infrastructure" },
  { name: "DICOM", desc: "Medical imaging data exchange standard" },
  { name: "X12 EDI", desc: "Insurance and billing transaction support" },
];

const compliance = [
  {
    icon: Shield,
    name: "HIPAA",
    desc: "Full compliance with the Health Insurance Portability and Accountability Act. BAA available.",
  },
  {
    icon: Lock,
    name: "SOC 2 Type II",
    desc: "Independently audited controls for security, availability, and confidentiality.",
  },
  {
    icon: Server,
    name: "ISO 27001",
    desc: "International standard for information security management systems.",
  },
];

export default function IntegrationsPage() {
  return (
    <div className="bg-background pt-24">
      {/* Hero */}
      <Section>
        <FadeUp>
          <h1 className="text-4xl lg:text-6xl font-display font-bold tracking-[-0.04em] leading-[0.95] text-foreground mb-4">
            Built to Connect.
            <br />
            <span className="text-gradient-teal">Built to Protect.</span>
          </h1>
          <p className="text-lg text-muted-foreground font-body max-w-2xl">
            Deep EHR integrations and enterprise-grade security — so you can focus
            on care, not compliance paperwork.
          </p>
        </FadeUp>
      </Section>

      {/* EHR Integrations */}
      <Section>
        <FadeUp>
          <h2 className="text-3xl font-display font-bold tracking-[-0.03em] text-foreground mb-4">
            EHR Integrations
          </h2>
          <p className="text-muted-foreground font-body mb-12 max-w-xl">
            Connect to your existing infrastructure in weeks, not months.
          </p>
        </FadeUp>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {ehrs.map((name, i) => (
            <FadeUp key={name} delay={i * 0.05}>
              <ClinicalCard className="text-center py-8">
                <p className="font-display font-semibold text-foreground/40 hover:text-foreground transition-colors duration-300 text-lg">
                  {name}
                </p>
              </ClinicalCard>
            </FadeUp>
          ))}
        </div>
      </Section>

      {/* Protocols */}
      <Section className="bg-card/30">
        <FadeUp>
          <h2 className="text-3xl font-display font-bold tracking-[-0.03em] text-foreground mb-12">
            Protocols & Standards
          </h2>
        </FadeUp>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {protocols.map((p, i) => (
            <FadeUp key={p.name} delay={i * 0.08}>
              <ClinicalCard>
                <h3 className="font-display font-bold text-foreground tabular-nums tracking-[-0.02em] text-xl mb-2">
                  {p.name}
                </h3>
                <p className="text-sm text-muted-foreground font-body">{p.desc}</p>
              </ClinicalCard>
            </FadeUp>
          ))}
        </div>
      </Section>

      {/* Security */}
      <Section>
        <FadeUp>
          <h2 className="text-3xl font-display font-bold tracking-[-0.03em] text-foreground mb-4">
            Security Architecture
          </h2>
          <p className="text-muted-foreground font-body mb-12 max-w-xl">
            AES-256 at rest. TLS 1.3 in transit. Zero-knowledge architecture.
          </p>
        </FadeUp>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {compliance.map((c, i) => (
            <FadeUp key={c.name} delay={i * 0.1}>
              <ClinicalCard>
                <c.icon className="w-10 h-10 text-primary mb-4" strokeWidth={1.5} />
                <h3 className="text-xl font-display font-bold text-foreground mb-2">{c.name}</h3>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">{c.desc}</p>
              </ClinicalCard>
            </FadeUp>
          ))}
        </div>

        {/* Architecture Diagram */}
        <FadeUp>
          <ClinicalCard hover={false} className="p-12">
            <div className="flex flex-col items-center gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
                {/* Layer 3: Stakeholders */}
                <div className="md:col-span-3 bg-accent rounded-xl p-6 border border-foreground/5 text-center">
                  <p className="text-xs text-muted-foreground font-body uppercase tracking-widest mb-2">Stakeholder Access</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {["Patients", "Families", "Doctors", "Specialists"].map((s) => (
                      <span key={s} className="px-3 py-1 rounded-full text-xs font-body bg-card border border-foreground/5 text-foreground">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Arrow */}
                <div className="md:col-span-3 flex justify-center">
                  <ArrowRight className="w-5 h-5 text-primary rotate-90" strokeWidth={1.5} />
                </div>

                {/* Layer 2: Aarogya360 */}
                <div className="md:col-span-3 bg-primary/5 rounded-xl p-6 border border-primary/20 text-center">
                  <p className="text-xs text-primary font-body uppercase tracking-widest mb-1">Aarogya360</p>
                  <p className="text-sm text-foreground font-display font-semibold">Encryption Vault & Intelligence Layer</p>
                </div>

                {/* Arrow */}
                <div className="md:col-span-3 flex justify-center">
                  <ArrowRight className="w-5 h-5 text-primary rotate-90" strokeWidth={1.5} />
                </div>

                {/* Layer 1: EHRs */}
                <div className="md:col-span-3 bg-accent rounded-xl p-6 border border-foreground/5 text-center">
                  <p className="text-xs text-muted-foreground font-body uppercase tracking-widest mb-2">EHR Layer</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {["Epic", "Cerner", "Allscripts", "MEDITECH"].map((s) => (
                      <span key={s} className="px-3 py-1 rounded-full text-xs font-body bg-card border border-foreground/5 text-foreground">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </ClinicalCard>
        </FadeUp>
      </Section>
    </div>
  );
}
