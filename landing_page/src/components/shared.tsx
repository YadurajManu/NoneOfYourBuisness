import { motion } from "framer-motion";
import { ReactNode } from "react";

interface SectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

export function Section({ children, className = "", id }: SectionProps) {
  return (
    <section id={id} className={`py-24 px-6 ${className}`}>
      <div className="max-w-7xl mx-auto">{children}</div>
    </section>
  );
}

export function FadeUp({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function ClinicalCard({
  children,
  className = "",
  hover = true,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <motion.div
      whileHover={
        hover
          ? {
              y: -5,
              boxShadow:
                "0 20px 40px rgba(0,0,0,0.4), 0 0 20px rgba(0, 212, 200, 0.1)",
            }
          : undefined
      }
      className={`bg-card border border-foreground/5 rounded-2xl p-8 transition-colors duration-300 ${
        hover ? "hover:border-primary/30" : ""
      } ${className}`}
      style={{ boxShadow: "var(--shadow-clinical)" }}
    >
      {children}
    </motion.div>
  );
}
