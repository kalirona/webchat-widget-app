import { Link, routes } from "wasp/client/router";
import { ChevronRight, BookOpen } from "lucide-react";
import { PublicNavbar } from "../marketing/PublicNavbar";
import { Footer } from "../landing-page/components/Footer";
import { footerNavigation } from "../landing-page/contentSections";
import { useLocation } from "react-router";

const DOCS_SIDEBAR = [
  { label: "HTML", href: routes.HtmlDocPageRoute.to, icon: "📄" },
  { label: "WordPress", href: routes.WordPressDocPageRoute.to, icon: "📝" },
  { label: "Shopify", href: routes.ShopifyDocPageRoute.to, icon: "🛍️" },
  { label: "Webflow", href: routes.WebflowDocPageRoute.to, icon: "🌐" },
  { label: "Installation", href: routes.InstallationDocPageRoute.to, icon: "⚡" },
];

export function DocsLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const location = useLocation();

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      <PublicNavbar />
      <div className="mx-auto flex w-full max-w-7xl flex-1 px-6 lg:px-8">
        <aside className="hidden w-64 shrink-0 border-r border-border/50 py-10 pr-8 lg:block">
          <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            Documentation
          </div>
          <nav className="space-y-1">
            {DOCS_SIDEBAR.map((item) => {
              const active = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                  {active && <ChevronRight className="ml-auto h-4 w-4" />}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 py-10 pl-0 lg:pl-10">
          <div className="prose prose-gray dark:prose-invert max-w-3xl">
            {children}
          </div>
        </main>
      </div>
      <Footer footerNavigation={footerNavigation} />
    </div>
  );
}
