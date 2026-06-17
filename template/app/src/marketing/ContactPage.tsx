import { useState } from "react";
import { PublicLayout } from "./PublicLayout";
import { Mail, MessageSquare, Send, Loader2, CheckCircle } from "lucide-react";

export function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSending(true);
    // Simulate sending — in production wire to your API
    await new Promise((r) => setTimeout(r, 1500));
    setSending(false);
    setSent(true);
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-6 py-24 lg:px-8">
        <div className="text-center">
          <h1 className="text-foreground text-4xl font-bold tracking-tight sm:text-5xl">
            Get in <span className="text-primary">touch</span>
          </h1>
          <p className="text-muted-foreground mt-6 text-lg leading-8">
            Have a question or need help? We'd love to hear from you.
          </p>
        </div>
        <div className="mt-16 grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
              <div className="bg-primary/10 text-primary mb-4 flex h-10 w-10 items-center justify-center rounded-xl">
                <Mail className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">Email us</h3>
              <p className="text-muted-foreground mt-1 text-sm">hello@example.com</p>
            </div>
            <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
              <div className="bg-primary/10 text-primary mb-4 flex h-10 w-10 items-center justify-center rounded-xl">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">Live chat</h3>
              <p className="text-muted-foreground mt-1 text-sm">Chat with our team during business hours</p>
            </div>
          </div>
          <div className="lg:col-span-3">
            {sent ? (
              <div className="bg-card rounded-2xl border border-border/50 p-10 text-center shadow-sm">
                <CheckCircle className="text-primary mx-auto mb-4 h-12 w-12" />
                <h2 className="text-xl font-semibold">Message sent!</h2>
                <p className="text-muted-foreground mt-2">We'll get back to you within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border/50 p-8 shadow-sm space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium">Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                    className="bg-muted w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="Your name" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                    className="bg-muted w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="you@example.com" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Message</label>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={5}
                    className="bg-muted w-full resize-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="How can we help?" />
                </div>
                <button type="submit" disabled={sending || !name.trim() || !email.trim() || !message.trim()}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-colors disabled:opacity-50">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sending ? "Sending..." : "Send message"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
