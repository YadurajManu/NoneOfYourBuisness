import { Link } from "react-router-dom";
import { MapPin, Clock, Send } from "lucide-react";
import { Section, FadeUp, ClinicalCard } from "@/components/shared";

const openRoles = [
  {
    title: "Full-Stack Engineer",
    location: "Remote / Dehradun",
    type: "Full-time",
    desc: "Build the core platform — React, Node.js, PostgreSQL, real-time systems. You'll own features end-to-end and shape the technical architecture.",
  },
  {
    title: "Clinical Product Designer",
    location: "Remote / Dehradun",
    type: "Full-time",
    desc: "Design interfaces for doctors, patients, and families. Deep empathy for clinical workflows and healthcare UX required.",
  },
  {
    title: "Healthcare Partnerships Lead",
    location: "Remote / Dehradun",
    type: "Full-time",
    desc: "Build relationships with hospitals and clinics across India. Own the go-to-market strategy and drive adoption of Aarogya360.",
  },
];

export default function CareersPage() {
  return (
    <div className="bg-background pt-24">
      <Section>
        <FadeUp>
          <h1 className="text-4xl lg:text-6xl font-display font-bold tracking-[-0.04em] leading-[0.95] text-foreground mb-4">
            Build the Future of
            <br />
            <span className="text-gradient-teal">Indian Healthcare</span>
          </h1>
          <p className="text-lg text-muted-foreground font-body max-w-2xl leading-relaxed">
            We're a lean, ambitious team based in Dehradun. If you're passionate
            about healthcare technology and want your work to matter — we want to
            hear from you.
          </p>
        </FadeUp>
      </Section>

      <Section className="pt-0">
        <FadeUp>
          <h2 className="text-3xl font-display font-bold tracking-[-0.03em] text-foreground mb-8">
            Open Positions
          </h2>
        </FadeUp>

        <div className="space-y-6">
          {openRoles.map((role, i) => (
            <FadeUp key={role.title} delay={i * 0.1}>
              <ClinicalCard>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-display font-bold text-foreground mb-2">{role.title}</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-body bg-accent border border-foreground/5 text-muted-foreground">
                        <MapPin className="w-3 h-3" strokeWidth={1.5} />
                        {role.location}
                      </span>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-body bg-accent border border-foreground/5 text-muted-foreground">
                        <Clock className="w-3 h-3" strokeWidth={1.5} />
                        {role.type}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground font-body leading-relaxed">{role.desc}</p>
                  </div>
                  <Link to="/contact"
                    className="btn-shimmer shrink-0 self-start md:self-center px-6 py-2.5 rounded-full text-sm font-body font-semibold text-primary-foreground text-center">
                    Apply Now
                  </Link>
                </div>
              </ClinicalCard>
            </FadeUp>
          ))}
        </div>
      </Section>

      {/* Open application CTA */}
      <Section>
        <FadeUp>
          <div className="relative rounded-3xl p-12 text-center overflow-hidden border border-primary/20 border-glow-teal">
            <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(ellipse at center, rgba(0,212,200,0.15) 0%, transparent 70%)" }} />
            <div className="relative z-10">
              <Send className="w-10 h-10 text-primary mx-auto mb-4" strokeWidth={1.5} />
              <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                Don't see your role?
              </h2>
              <p className="text-muted-foreground font-body mb-6 max-w-md mx-auto">
                Send us your story. We're always looking for passionate people who
                want to make healthcare better.
              </p>
              <Link to="/contact"
                className="inline-flex px-8 py-3 rounded-full text-sm font-body font-semibold border border-foreground/10 text-foreground hover:border-primary/30 transition-colors">
                Open Application
              </Link>
            </div>
          </div>
        </FadeUp>
      </Section>
    </div>
  );
}
