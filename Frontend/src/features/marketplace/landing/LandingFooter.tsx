import { Link } from "react-router-dom";
import { Logo } from "@/components/ui/logo";

const PRODUCT_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
];

const COMPANY_LINKS = [
  { label: "Contact", to: "/contact" },
  { label: "Log In", to: "/login" },
  { label: "Sign Up", to: "/register" },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-background" id="footer">
      <div className="mx-auto max-w-[1100px] px-6 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <Logo className="h-7 w-7 rounded-sm" />
              <span className="text-sm font-semibold tracking-tight">YouCollab</span>
            </Link>
            <p className="mt-3 text-[12px] text-muted-foreground max-w-[220px] leading-relaxed">
              Where Pune's brands and creators actually find each other.
            </p>
          </div>

          <nav aria-label="Product">
            <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
              Product
            </h3>
            <ul className="space-y-2">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Company">
            <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
              Company
            </h3>
            <ul className="space-y-2">
              {COMPANY_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 pt-6 border-t border-border text-[12px] text-muted-foreground text-center">
          © {new Date().getFullYear()} YouCollab
        </div>
      </div>
    </footer>
  );
}
