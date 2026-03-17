import { Link } from "react-router-dom";

const productLinks = [
  { label: "Features", href: "/product" },
  { label: "Integrations", href: "/integrations" },
  { label: "Pricing", href: "/pricing" },
  { label: "Patient Lifecycle", href: "/lifecycle" },
  { label: "Use Cases", href: "/use-cases" },
];

const companyLinks = [
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Careers", href: "/careers" },
  { label: "Contact", href: "/contact" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/about" },
  { label: "Terms of Service", href: "/about" },
  { label: "BAA", href: "/about" },
];

export default function Footer() {
  return (
    <footer className="bg-obsidian-900 border-t border-primary/20">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Logo & tagline */}
          <div className="md:col-span-1">
            <Link to="/" className="font-display font-bold text-xl tracking-tight text-foreground">
              Aarogya<span className="text-primary">360</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              Full-Circle Patient Care. Powered by Intelligence.
            </p>
            <div className="mt-4 space-y-1 text-xs text-muted-foreground">
              <p>📍 Dehradun, Uttarakhand, India</p>
              <p>📞 <a href="tel:+919220916445" className="hover:text-primary transition-colors">+91 92209 16445</a></p>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-display font-semibold text-sm text-foreground mb-4">Product</h4>
            <ul className="space-y-3">
              {productLinks.map((l) => (
                <li key={l.label}>
                  <Link to={l.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-display font-semibold text-sm text-foreground mb-4">Company</h4>
            <ul className="space-y-3">
              {companyLinks.map((l) => (
                <li key={l.label}>
                  <Link to={l.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-display font-semibold text-sm text-foreground mb-4">Legal & Compliance</h4>
            <ul className="space-y-3">
              {legalLinks.map((l) => (
                <li key={l.label}>
                  <Link to={l.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="mt-16 pt-8 border-t border-foreground/5 flex flex-col gap-4 items-center">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
            <p className="text-xs text-muted-foreground">
              © 2025 Aarogya360. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground">HIPAA Compliant</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">SOC 2 Type II</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">ISO 27001</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Founded with ❤️ by Yaduraj Singh in Dehradun, India
          </p>
        </div>
      </div>
    </footer>
  );
}
