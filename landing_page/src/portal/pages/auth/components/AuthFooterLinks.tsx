import { Link } from "react-router-dom";

export function AuthFooterLinks() {
  return (
    <footer className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
      <Link to="/privacy" className="transition-colors hover:text-foreground">
        Privacy
      </Link>
      <span className="text-foreground/20">·</span>
      <Link to="/terms" className="transition-colors hover:text-foreground">
        Terms
      </Link>
      <span className="text-foreground/20">·</span>
      <Link to="/baa" className="transition-colors hover:text-foreground">
        BAA
      </Link>
      <span className="text-foreground/20">·</span>
      <Link to="/" className="transition-colors hover:text-foreground">
        Back to site
      </Link>
    </footer>
  );
}
