import { DocsLayout } from "./DocsLayout";
import { AlertCircle } from "lucide-react";

export function HtmlDocPage() {
  return (
    <DocsLayout title="HTML Integration">
      <h1 className="text-3xl font-bold tracking-tight">HTML / Vanilla JS</h1>
      <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
        Add the AI chat widget to any static HTML website.
      </p>

      <h2 className="mt-12 text-xl font-semibold">Step 1: Add the Script</h2>
      <p className="text-muted-foreground mt-2 leading-relaxed">
        Open your <code className="bg-muted rounded px-1.5 py-0.5 text-sm font-mono">index.html</code> file and add the script tag inside the <code className="bg-muted rounded px-1.5 py-0.5 text-sm font-mono">{'<head>'}</code> section:
      </p>
      <pre className="bg-muted mt-4 overflow-x-auto rounded-xl border border-border/50 p-4 text-sm leading-relaxed">
{`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>My Website</title>
  <script src="https://your-app.com/widget/widget.js"
    data-website-id="YOUR_WEBSITE_ID" defer></script>
</head>
<body>
  <!-- your content -->
</body>
</html>`}
      </pre>

      <h2 className="mt-10 text-xl font-semibold">Step 2: Configure</h2>
      <p className="text-muted-foreground mt-2 leading-relaxed">
        The widget will automatically load and render a chat bubble. Customize colors, position, and agent in your dashboard under Websites → Edit.
      </p>

      <div className="bg-amber-50 dark:bg-amber-900/20 mt-12 rounded-xl border border-amber-200/50 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">Important</h3>
            <p className="text-amber-700 dark:text-amber-300 mt-1 text-sm">
              Make sure your website domain is either allowed in the widget settings or leave the allowed domains field empty to allow all domains.
            </p>
          </div>
        </div>
      </div>

      <h2 className="mt-10 text-xl font-semibold">Single Page Apps</h2>
      <p className="text-muted-foreground mt-2 leading-relaxed">
        For SPAs (React, Vue, Angular), add the script tag to your root HTML file once. The widget handles route changes automatically.
      </p>
    </DocsLayout>
  );
}
