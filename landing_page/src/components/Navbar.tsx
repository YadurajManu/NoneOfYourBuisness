import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Product", href: "/product" },
  { label: "Integrations", href: "/integrations" },
  { label: "Pricing", href: "/pricing" },
  { label: "Use Cases", href: "/use-cases" },
  { label: "Lifecycle", href: "/lifecycle" },
  { label: "Blog", href: "/blog" },
  { label: "Careers", href: "/careers" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/80 backdrop-blur-xl border-b border-foreground/5"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display font-bold text-xl tracking-tight text-foreground">
              Aarogya<span className="text-primary">360</span>
            </span>
            {/* Pulse ring icon */}
            <span className="relative flex items-center justify-center w-5 h-5">
              <span className="absolute w-4 h-4 rounded-full border-2 border-primary animate-ping opacity-30" />
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse-teal" />
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-sm font-body transition-colors duration-200 ${
                  location.pathname === link.href
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden lg:block">
            <Link
              to="/contact"
              className="btn-shimmer inline-flex items-center px-5 py-2 rounded-full text-sm font-body font-semibold text-primary-foreground transition-all"
            >
              Request Demo
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-foreground"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" strokeWidth={1.5} />
          </button>
        </div>
      </motion.nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-80 bg-card z-50 p-8 flex flex-col border-l border-foreground/5 overflow-y-auto"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="self-end text-foreground mb-8"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" strokeWidth={1.5} />
              </button>
              <div className="flex flex-col gap-6">
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      to={link.href}
                      className={`text-lg font-display font-semibold ${
                        location.pathname === link.href
                          ? "text-primary"
                          : "text-foreground"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
                <Link
                  to="/contact"
                  className="btn-shimmer mt-4 text-center px-6 py-3 rounded-full text-sm font-body font-semibold text-primary-foreground"
                >
                  Request Demo
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
