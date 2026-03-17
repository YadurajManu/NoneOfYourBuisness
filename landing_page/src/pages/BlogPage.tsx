import { Link } from "react-router-dom";
import { Section, FadeUp, ClinicalCard } from "@/components/shared";

const posts = [
  { category: "Patient Safety", title: "Why India's Hospitals Are Losing Patients Between Departments", excerpt: "Fragmented records and siloed systems are creating dangerous gaps in care continuity.", date: "Mar 12, 2025" },
  { category: "Health Tech India", title: "The Hidden Cost of Fragmented Medical Records", excerpt: "How disconnected health data is costing Indian hospitals crores in inefficiency and readmissions.", date: "Mar 5, 2025" },
  { category: "Clinical AI", title: "How AI Can Reduce 30-Day Readmissions by 12%", excerpt: "Machine learning models that predict readmission risk and trigger proactive interventions.", date: "Feb 28, 2025" },
  { category: "Patient Safety", title: "Building Trust with Families During Long-Term Care", excerpt: "Transparent communication tools that keep families informed without overwhelming clinical staff.", date: "Feb 20, 2025" },
  { category: "Health Tech India", title: "HL7 FHIR R4: The Integration Standard Changing Indian Healthcare", excerpt: "How modern interoperability standards are enabling seamless EHR connectivity across India.", date: "Feb 14, 2025" },
  { category: "Clinical AI", title: "From 22 Minutes to 6: How AI is Transforming Discharge Summaries", excerpt: "Automated clinical documentation that saves physicians hours every week.", date: "Feb 7, 2025" },
];

export default function BlogPage() {
  return (
    <div className="bg-background pt-24">
      <Section>
        <FadeUp>
          <h1 className="text-4xl lg:text-6xl font-display font-bold tracking-[-0.04em] leading-[0.95] text-foreground mb-4">
            Insights on the Future of
            <br />
            <span className="text-gradient-teal">Connected Care</span>
          </h1>
          <p className="text-lg text-muted-foreground font-body max-w-2xl">
            Research, perspectives, and practical guides from the Aarogya360 team.
          </p>
        </FadeUp>
      </Section>

      <Section className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post, i) => (
            <FadeUp key={post.title} delay={i * 0.08}>
              <ClinicalCard className="flex flex-col h-full">
                <span className="inline-flex self-start px-3 py-1 rounded-full text-xs font-body font-medium bg-primary/10 text-primary border border-primary/20 mb-4">
                  {post.category}
                </span>
                <h3 className="text-lg font-display font-bold text-foreground mb-2 leading-snug flex-1">
                  {post.title}
                </h3>
                <p className="text-sm text-muted-foreground font-body mb-4 leading-relaxed">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-foreground/5">
                  <span className="text-xs text-muted-foreground font-body">{post.date}</span>
                  <span className="text-xs text-primary font-body font-medium cursor-pointer hover:underline">
                    Read More →
                  </span>
                </div>
              </ClinicalCard>
            </FadeUp>
          ))}
        </div>
      </Section>
    </div>
  );
}
