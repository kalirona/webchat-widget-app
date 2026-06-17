import { useState } from "react";
import { PublicLayout } from "./PublicLayout";
import { ChevronDown, Search } from "lucide-react";

const FAQS = [
  { q: "How does the AI chat widget work?", a: "Add a single script tag to your website. The widget automatically loads and engages visitors with AI-powered responses based on your knowledge base and configured AI model." },
  { q: "Which AI providers do you support?", a: "We support OpenAI (GPT-4o, GPT-4o-mini) and Google Gemini (Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini 2.5 Pro). You can configure your preferred provider in the settings." },
  { q: "Can I customize the widget appearance?", a: "Yes! You can customize the widget color, position (left/right), title, avatar, and welcome message. On Pro plans, you can also remove our branding and add your own logo." },
  { q: "How does human handoff work?", a: "When the AI fails to answer a query or when a visitor requests to speak with a human, the conversation is automatically escalated. Team members receive an email notification and can reply directly from the inbox." },
  { q: "What kind of analytics do you provide?", a: "You can track conversations, token usage, AI model costs, visitor behavior, and team performance. All data is aggregated daily and available in the dashboard." },
  { q: "Can I upload my own knowledge base?", a: "Yes! Upload PDF, DOCX, or TXT files, or enter custom text. You can also crawl your website to automatically build a knowledge base. The AI uses RAG to find relevant information." },
  { q: "Is my data secure?", a: "All data is encrypted at rest. API keys are encrypted using AES-256-GCM. We enforce organization-scoped access and provide SSRF protection for web crawling." },
  { q: "What if I exceed my plan limits?", a: "You'll receive a warning at 80% usage. If you hit your limit, features will be temporarily paused. You can upgrade your plan at any time to increase limits." },
  { q: "Can I try before buying?", a: "Yes! We offer a free plan with limited features so you can test the platform thoroughly before upgrading." },
];

export function FAQPage() {
  const [openId, setOpenId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const filtered = FAQS.filter(
    (faq) =>
      !search ||
      faq.q.toLowerCase().includes(search.toLowerCase()) ||
      faq.a.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-6 py-24 lg:px-8">
        <div className="text-center">
          <h1 className="text-foreground text-4xl font-bold tracking-tight sm:text-5xl">
            Frequently asked <span className="text-primary">questions</span>
          </h1>
          <p className="text-muted-foreground mt-6 text-lg leading-8">
            Everything you need to know about the AI Agent platform.
          </p>
        </div>
        <div className="relative mt-12">
          <Search className="text-muted-foreground absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search FAQ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-muted w-full rounded-xl py-3.5 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="mt-10 space-y-3">
          {filtered.map((faq, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border/50 overflow-hidden">
              <button
                onClick={() => setOpenId(openId === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-5 text-left"
              >
                <span className="font-semibold pr-4">{faq.q}</span>
                <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${openId === i ? "rotate-180" : ""}`} />
              </button>
              {openId === i && (
                <div className="border-t border-border/50 px-6 py-5">
                  <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
