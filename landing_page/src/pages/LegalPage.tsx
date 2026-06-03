import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { ClinicalCard, FadeUp, Section } from "@/components/shared";
import { getLegalPage } from "@/pages/legal-content";

const accentStyles = {
  teal: "text-primary bg-primary/10 border-primary/20",
};

export default function LegalPage({ slug }: { slug: string }) {
  const page = getLegalPage(slug);

  if (!page) {
    return <Navigate to="/404" replace />;
  }

  const Icon = page.icon;
  const accentClass = accentStyles[page.accent];

  return (
    <div className="bg-background pt-24">
      <Section className="relative overflow-hidden pt-14 lg:pt-16">
        <div
          className="absolute left-[42%] top-10 h-96 w-96 -translate-x-1/2 rounded-full bg-primary opacity-[0.08] blur-3xl"
        />

        <FadeUp>
          <Link
            to="/"
            className="mb-12 inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-card/35 px-4 py-2 text-sm font-body text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            Back to home
          </Link>
        </FadeUp>

        <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 items-start">
          <FadeUp>
            <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-body font-semibold ${accentClass}`}>
              <Icon className="h-4 w-4" strokeWidth={1.5} />
              {page.eyebrow}
            </div>
            <h1 className="mt-8 text-4xl lg:text-6xl font-display font-bold tracking-[-0.04em] leading-[0.95] text-foreground">
              {page.title}
            </h1>
            <p className="mt-5 text-sm font-body text-primary">{page.updated}</p>
            <p className="mt-6 max-w-3xl text-lg text-muted-foreground font-body leading-relaxed">
              {page.summary}
            </p>
          </FadeUp>

          <FadeUp delay={0.1}>
            <ClinicalCard className="lg:sticky lg:top-28" hover={false}>
              <h2 className="text-xl font-display font-bold text-foreground mb-5">
                At a glance
              </h2>
              <ul className="space-y-4">
                {page.highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.5} />
                    <span className="text-sm font-body leading-relaxed text-muted-foreground">
                      {highlight}
                    </span>
                  </li>
                ))}
              </ul>
            </ClinicalCard>
          </FadeUp>
        </div>
      </Section>

      <Section className="pt-0">
        <div className="max-w-4xl space-y-5">
          {page.sections.map((section, index) => (
            <FadeUp key={section.title} delay={index * 0.05}>
              <ClinicalCard hover={false}>
                <h2 className="text-2xl font-display font-bold tracking-[-0.02em] text-foreground mb-4">
                  {section.title}
                </h2>
                <div className="space-y-4">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-sm md:text-base font-body leading-relaxed text-muted-foreground">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </ClinicalCard>
            </FadeUp>
          ))}
        </div>
      </Section>
    </div>
  );
}
