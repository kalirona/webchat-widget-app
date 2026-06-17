import { PublicLayout } from "./PublicLayout";
import { Calendar, ArrowRight, Bot, Globe, Zap, MessageSquare } from "lucide-react";
import { Link, routes } from "wasp/client/router";

const POSTS = [
  { title: "How to Add an AI Chat Widget to Your Website in 5 Minutes", desc: "A step-by-step guide to embedding our AI-powered chat widget on any website.", date: "Jun 10, 2026", icon: Globe, tags: ["tutorial", "integration"] },
  { title: "Building a Smart Knowledge Base with RAG", desc: "Learn how RAG (Retrieval-Augmented Generation) powers accurate AI responses from your documents.", date: "Jun 3, 2026", icon: Bot, tags: ["ai", "technical"] },
  { title: "Proactive Triggers: Engaging Visitors at the Right Moment", desc: "How time-on-page, scroll depth, and exit intent triggers can boost conversion rates.", date: "May 25, 2026", icon: Zap, tags: ["product", "conversion"] },
  { title: "Human Handoff: When AI Needs a Helping Hand", desc: "Best practices for setting up and managing the AI-to-human escalation workflow.", date: "May 18, 2026", icon: MessageSquare, tags: ["workflow", "support"] },
  { title: "Understanding AI Costs and Token Usage", desc: "A breakdown of how token usage works and tips to optimize your AI spending.", date: "May 10, 2026", icon: Zap, tags: ["technical", "billing"] },
];

export function BlogPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl px-6 py-24 lg:px-8">
        <div className="text-center">
          <h1 className="text-foreground text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="text-primary">Blog</span>
          </h1>
          <p className="text-muted-foreground mt-6 text-lg leading-8">
            Product updates, tutorials, and best practices.
          </p>
        </div>
        <div className="mt-16 space-y-8">
          {POSTS.map((post, i) => {
            const Icon = post.icon;
            return (
              <article key={i} className="bg-card hover:border-primary/50 group rounded-2xl border border-border/50 p-6 shadow-sm transition-colors">
                <div className="flex items-start gap-5">
                  <div className="bg-primary/10 text-primary hidden shrink-0 items-center justify-center rounded-xl p-3 sm:flex">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{post.date}</span>
                      {post.tags.map((t) => (
                        <span key={t} className="bg-muted rounded-full px-2.5 py-0.5 text-xs capitalize">{t}</span>
                      ))}
                    </div>
                    <h2 className="mt-2 text-xl font-semibold group-hover:text-primary transition-colors">{post.title}</h2>
                    <p className="text-muted-foreground mt-2 leading-relaxed">{post.desc}</p>
                    <span className="text-primary mt-3 inline-flex items-center gap-1 text-sm font-medium">
                      Read more <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </PublicLayout>
  );
}
