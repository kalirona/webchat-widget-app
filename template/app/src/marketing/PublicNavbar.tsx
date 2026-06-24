import { Link as WaspRouterLink } from "wasp/client/router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "../../client/components/ui/button";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/faq" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
  { label: "Docs", href: "/docs/installation" },
];

export function PublicNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <WaspRouterLink to="/" className="text-xl font-bold tracking-tight">
          AI Agent
        </WaspRouterLink>
        <div className="hidden items-center gap-6 md:flex">
          {NAV_ITEMS.map((item) => (
            <WaspRouterLink
              key={item.href}
              to={item.href}
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              {item.label}
            </WaspRouterLink>
          ))}
          <div className="ml-4 flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <WaspRouterLink to={"/login"}>Log in</WaspRouterLink>
            </Button>
            <Button size="sm" asChild>
              <WaspRouterLink to={"/signup"}>Get Started</WaspRouterLink>
            </Button>
          </div>
        </div>
        <button onClick={() => setOpen(!open)} className="md:hidden">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border/50 md:hidden">
          <div className="space-y-1 px-6 py-4">
            {NAV_ITEMS.map((item) => (
              <WaspRouterLink
                key={item.href}
                to={item.href}
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground block py-2 text-sm font-medium transition-colors"
              >
                {item.label}
              </WaspRouterLink>
            ))}
            <hr className="border-border/50 my-3" />
            <WaspRouterLink to={"/login"} onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground block py-2 text-sm font-medium transition-colors">Log in</WaspRouterLink>
            <WaspRouterLink to={"/signup"} onClick={() => setOpen(false)} className="text-primary hover:text-primary/80 block py-2 text-sm font-medium transition-colors">Get Started →</WaspRouterLink>
          </div>
        </div>
      )}
    </nav>
  );
}

