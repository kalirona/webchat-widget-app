import { PublicLayout } from "./PublicLayout";
import { CheckCircle, Zap, Bot, Globe, MessageSquare, Shield, BarChart, Users } from "lucide-react";

const FEATURES = [
  { icon: Bot, title: "AI Chat Widget", desc: "Embeddable chat widget with AI-powered responses using OpenAI & Gemini." },
  { icon: MessageSquare, title: "Multi-Provider AI", desc: "Support for OpenAI GPT-4o and Google Gemini models with automatic fallback." },
  { icon: Globe, title: "Website Embed", desc: "Add to any website with a single script tag. Works with WordPress, Shopify, Webflow, and HTML." },
  { icon: Users, title: "Human Handoff", desc: "Seamlessly escalate to human agents when AI can't resolve queries." },
  { icon: Shield, title: "Knowledge Base", desc: "Upload documents, crawl websites, and build a custom knowledge base for your AI." },
  { icon: BarChart, title: "Analytics", desc: "Track conversations, token usage, costs, and visitor behavior in real-time." },
  { icon: Zap, title: "Proactive Triggers", desc: "Automatically engage visitors based on time on page, scroll depth, or exit intent." },
  { icon: CheckCircle, title: "White Label", desc: "Remove branding and customize colors, logo, and company name on Pro plans." },
];

export function FeaturesPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-foreground text-4xl font-bold tracking-tight sm:text-5xl">
            Everything you need to <span className="text-primary">engage</span> your visitors
          </h1>
          <p className="text-muted-foreground mt-6 text-lg leading-8">
            AI-powered customer engagement platform with seamless human handoff and deep customization.
          </p>
        </div>
        <div className="mt-20 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="bg-card hover:border-primary/50 rounded-2xl border border-border/50 p-6 shadow-sm transition-colors">
                <div className="bg-primary/10 text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </PublicLayout>
  );
}
