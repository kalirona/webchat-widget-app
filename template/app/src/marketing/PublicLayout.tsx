import { PublicNavbar } from "./PublicNavbar";
import { Footer } from "../landing-page/components/Footer";
import { footerNavigation } from "../landing-page/contentSections";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <Footer footerNavigation={footerNavigation} />
    </div>
  );
}
