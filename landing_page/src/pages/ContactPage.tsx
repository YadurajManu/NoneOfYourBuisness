import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Mail, Phone, MapPin, Shield, MessageCircle, User } from "lucide-react";
import { Section, FadeUp, ClinicalCard } from "@/components/shared";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", org: "", role: "", email: "", phone: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setSubmitted(true); };

  const inputClass =
    "w-full bg-background border border-foreground/10 rounded-lg px-4 py-3 text-sm font-body text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none";

  return (
    <div className="bg-background pt-24">
      <Section>
        <FadeUp>
          <h1 className="text-4xl lg:text-6xl font-display font-bold tracking-[-0.04em] leading-[0.95] text-foreground mb-4">
            Let's Talk About<br />
            <span className="text-gradient-teal">Better Care.</span>
          </h1>
        </FadeUp>

        <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Form */}
          <FadeUp>
            <AnimatePresence mode="wait">
              {!submitted ? (
                <motion.form key="form" initial={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }}
                  onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <input required type="text" placeholder="Full Name" value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
                    <input required type="text" placeholder="Organization" value={form.org}
                      onChange={(e) => setForm({ ...form, org: e.target.value })} className={inputClass} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <input type="text" placeholder="Your Role" value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputClass} />
                    <input required type="email" placeholder="Email Address" value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
                  </div>
                  <input type="tel" placeholder="Phone Number (optional)" value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
                  <textarea rows={4} placeholder="Tell us about your organization and goals..."
                    value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className={`${inputClass} resize-none`} />
                  <button type="submit" className="w-full btn-shimmer py-3 rounded-full text-sm font-body font-semibold text-primary-foreground">
                    Request Demo
                  </button>
                </motion.form>
              ) : (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-20">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}>
                    <CheckCircle2 className="w-16 h-16 text-primary mb-6" strokeWidth={1.5} />
                  </motion.div>
                  <h3 className="text-2xl font-display font-bold text-foreground mb-2">Thank you!</h3>
                  <p className="text-muted-foreground font-body text-center max-w-sm">
                    We'll be in touch within 1 business day to schedule your personalized demo.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </FadeUp>

          {/* Contact details */}
          <FadeUp delay={0.15}>
            <div className="space-y-6">
              <ClinicalCard hover={false}>
                <h3 className="font-display font-bold text-foreground mb-6">Get in Touch</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-primary" strokeWidth={1.5} />
                    <div>
                      <span className="text-sm text-foreground font-body font-medium">Yaduraj Singh</span>
                      <span className="text-xs text-muted-foreground font-body ml-2">Founder & CEO</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-primary" strokeWidth={1.5} />
                    <span className="text-sm text-muted-foreground font-body">hello@aarogya360.com</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-primary" strokeWidth={1.5} />
                    <a href="tel:+919220916445" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors">
                      +91 92209 16445
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-primary" strokeWidth={1.5} />
                    <span className="text-sm text-muted-foreground font-body">Dehradun, Uttarakhand 248001, India</span>
                  </div>
                </div>
                <div className="mt-6">
                  <a
                    href="https://wa.me/919220916445"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-body font-semibold transition-all"
                    style={{ backgroundColor: "#25D366", color: "#fff" }}
                  >
                    <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
                    WhatsApp Us
                  </a>
                </div>
              </ClinicalCard>

              {/* Google Maps Embed */}
              <ClinicalCard hover={false} className="p-0 overflow-hidden">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d110502.59630674498!2d77.93464840367455!3d30.316494636498827!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390929c356c888af%3A0x4c3562c032518799!2sDehradun%2C%20Uttarakhand%2C%20India!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
                  width="100%"
                  height="220"
                  style={{ border: 0, filter: "invert(90%) hue-rotate(180deg) brightness(0.9) contrast(1.1)" }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Aarogya360 Location - Dehradun"
                />
              </ClinicalCard>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-3">
                {["HIPAA Compliant", "SOC 2 Type II", "ISO 27001"].map((badge) => (
                  <span key={badge} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body bg-accent border border-foreground/5 text-muted-foreground">
                    <Shield className="w-3 h-3 text-primary" strokeWidth={1.5} />
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </Section>
    </div>
  );
}
