import { PublicLayout } from "./PublicLayout";
import { Hero } from "../landing-page/components/Hero";
import { FeaturesGrid } from "../landing-page/components/FeaturesGrid";
import { features } from "../landing-page/contentSections";
import { SchemaMarkup } from "../landing-page/components/SchemaMarkup";

export function HomePage() {
  return (
    <PublicLayout>
      <SchemaMarkup />
      <Hero />
      <FeaturesGrid features={features} />
    </PublicLayout>
  );
}
