import { DocsLayout } from "./DocsLayout";
import { Code2, Copy, Check } from "lucide-react";
import { useState } from "react";

function CodeBlock({ code, lang = "html" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="bg-muted relative my-4 rounded-xl border border-border/50 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-2">
        <span className="text-muted-foreground text-xs font-medium uppercase">{lang}</span>
        <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="hover:bg-background flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed"><code>{code}</code></pre>
    </div>
  );
}

export function InstallationDocPage() {
  return (
    <DocsLayout title="Installation">
      <h1 className="text-3xl font-bold tracking-tight">Installation</h1>
      <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
        Get the AI chat widget running on your website in under 5 minutes.
      </p>

      <h2 className="mt-12 text-xl font-semibold">1. Create a Website</h2>
      <p className="text-muted-foreground mt-2 leading-relaxed">
        Log into your dashboard and navigate to <strong>Websites</strong>. Click <strong>Add Website</strong> and enter your site name and URL.
      </p>

      <h2 className="mt-10 text-xl font-semibold">2. Configure the Widget</h2>
      <p className="text-muted-foreground mt-2 leading-relaxed">
        Customize the widget appearance, colors, position, and linked AI agent. You can change these at any time.
      </p>

      <h2 className="mt-10 text-xl font-semibold">3. Add the Script</h2>
      <p className="text-muted-foreground mt-2 leading-relaxed">
        Copy the embed code from your website settings and add it to your site's <code className="bg-muted rounded px-1.5 py-0.5 text-sm font-mono">{'<head>'}</code> tag:
      </p>
      <CodeBlock code={'<script src="https://your-app.com/widget/widget.js" data-website-id="YOUR_WEBSITE_ID" defer></script>'} />
      <p className="text-muted-foreground mt-2 leading-relaxed">
        Replace <code className="bg-muted rounded px-1.5 py-0.5 text-sm font-mono">YOUR_WEBSITE_ID</code> with the ID from your website settings.
      </p>

      <h2 className="mt-10 text-xl font-semibold">4. Verify</h2>
      <p className="text-muted-foreground mt-2 leading-relaxed">
        Visit your website and look for the chat bubble in the bottom corner. Click it to test the widget. Conversations will appear in your dashboard inbox.
      </p>

      <div className="bg-primary/5 border-primary/30 mt-12 rounded-xl border p-6">
        <h3 className="font-semibold text-primary">Need help?</h3>
        <p className="text-muted-foreground mt-1 text-sm">Check our integration guides for specific platforms or contact support.</p>
      </div>
    </DocsLayout>
  );
}
