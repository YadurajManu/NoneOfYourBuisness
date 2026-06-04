import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Clock3, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";

const directoryLinks = [
  { label: "Product", href: "/product" },
  { label: "Integrations", href: "/integrations" },
  { label: "Pricing", href: "/pricing" },
  { label: "Use Cases", href: "/use-cases" },
  { label: "Lifecycle", href: "/lifecycle" },
  { label: "Careers", href: "/careers" },
];

const companyLinks = [
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "BAA", href: "/baa" },
];

const compliance = ["HIPAA Compliant", "SOC 2 Type II", "ISO 27001", "HL7 FHIR R4"];

function useIndianTime() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      setTime(
        new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(new Date())
      );
    };

    updateTime();
    const interval = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(interval);
  }, []);

  return time;
}

function FooterHeading({ children }: { children: string }) {
  return (
    <h4 className="mb-7 text-[10px] font-body font-semibold uppercase tracking-[0.42em] text-primary/80">
      {children}
    </h4>
  );
}

export default function Footer() {
  const time = useIndianTime();

  return (
    <footer className="relative overflow-hidden border-t border-primary/15 bg-[hsl(var(--footer-bg))]">
      <div className="absolute inset-x-0 top-0 h-px bg-primary/50" />
      <div className="absolute inset-x-0 top-2 h-px bg-primary/20" />
      <div
        className="pointer-events-none absolute left-1/2 top-10 h-96 w-[720px] -translate-x-1/2 rounded-full opacity-10 blur-3xl"
        style={{ background: "hsl(177 100% 41%)" }}
      />

      <div className="relative mx-auto max-w-7xl px-6 pb-14 pt-24 lg:pb-16 lg:pt-20">
        <div className="flex flex-col gap-8 border-b border-primary/20 pb-10 text-center">
          <p className="text-[10px] font-body uppercase tracking-[0.55em] text-primary/60">
            Dehradun, India - Full-circle patient care
          </p>
          <Link
            to="/"
            className="font-display text-5xl font-bold leading-none tracking-[-0.055em] text-foreground sm:text-7xl lg:text-8xl"
          >
            Aarogya<span className="text-gradient-teal">360</span>
          </Link>
          <p className="mx-auto max-w-xl text-sm font-body italic leading-relaxed text-muted-foreground">
            One record for every stakeholder, every handoff, and every stage of care.
          </p>
        </div>

        <div className="grid grid-cols-1 border-b border-foreground/5 lg:grid-cols-[1.15fr_1fr_1fr_1fr]">
          <div className="border-b border-foreground/5 py-10 lg:border-b-0 lg:border-r lg:border-foreground/5 lg:pr-10">
            <FooterHeading>About Aarogya360</FooterHeading>
            <p className="max-w-md text-base font-body leading-8 text-muted-foreground">
              Aarogya360 connects patients, families, doctors, specialists, and AI
              workflows through a single healthcare lifecycle record built for
              hospitals and multi-specialty clinics.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {compliance.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-body text-muted-foreground"
                >
                  <ShieldCheck className="h-3 w-3 text-primary" strokeWidth={1.5} />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="border-b border-foreground/5 py-10 lg:border-b-0 lg:border-r lg:border-foreground/5 lg:px-10">
            <FooterHeading>Directory</FooterHeading>
            <ul className="space-y-0">
              {directoryLinks.map((link, index) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="group flex items-center justify-between border-b border-dashed border-foreground/10 py-3 text-lg font-display text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span>{link.label}</span>
                    <span className="text-[10px] font-body tabular-nums text-primary/50 transition-colors group-hover:text-primary">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-b border-foreground/5 py-10 lg:border-b-0 lg:border-r lg:border-foreground/5 lg:px-10">
            <FooterHeading>Correspondence</FooterHeading>
            <div className="space-y-7">
              <div>
                <p className="mb-2 text-[10px] font-body uppercase tracking-[0.36em] text-primary/50">
                  Electronic post
                </p>
                <a
                  href="mailto:hello@aarogya360.com"
                  className="inline-flex items-center gap-2 text-sm font-body text-muted-foreground transition-colors hover:text-primary"
                >
                  <Mail className="h-4 w-4" strokeWidth={1.5} />
                  hello@aarogya360.com
                </a>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-body uppercase tracking-[0.36em] text-primary/50">
                  Phone
                </p>
                <a
                  href="tel:+919220916445"
                  className="inline-flex items-center gap-2 text-sm font-body text-muted-foreground transition-colors hover:text-primary"
                >
                  <Phone className="h-4 w-4" strokeWidth={1.5} />
                  +91 92209 16445
                </a>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-body uppercase tracking-[0.36em] text-primary/50">
                  Bureau
                </p>
                <p className="inline-flex items-start gap-2 text-sm font-body leading-relaxed text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 text-primary" strokeWidth={1.5} />
                  Dehradun, Uttarakhand
                  <br />
                  India
                </p>
              </div>
            </div>
          </div>

          <div className="py-10 lg:pl-10">
            <FooterHeading>Local Time</FooterHeading>
            <div className="inline-flex items-center gap-3 rounded-full border border-primary/15 bg-primary/5 px-4 py-2 text-sm font-body text-primary">
              <Clock3 className="h-4 w-4" strokeWidth={1.5} />
              IST - {time || "--:--:--"}
            </div>

            <div className="mt-9">
              <FooterHeading>Company</FooterHeading>
              <div className="space-y-3">
                {companyLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="group flex items-center justify-between border-b border-dashed border-foreground/10 py-2 text-sm font-body text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-40 transition-opacity group-hover:opacity-100" strokeWidth={1.5} />
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-9">
              <FooterHeading>Legal</FooterHeading>
              <div className="space-y-3">
                {legalLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="group flex items-center justify-between border-b border-dashed border-foreground/10 py-2 text-sm font-body text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-40 transition-opacity group-hover:opacity-100" strokeWidth={1.5} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-7 text-xs font-body text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© 2026 Aarogya360. All rights reserved.</p>
          <p>Founded by Yaduraj Singh in Dehradun, India.</p>
        </div>
      </div>
    </footer>
  );
}
