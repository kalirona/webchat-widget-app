import { DocsLayout } from "./DocsLayout";

export function WebflowDocPage() {
  return (
    <DocsLayout title="Webflow Integration">
      <h1 className="text-3xl font-bold tracking-tight">Webflow</h1>
      <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
        Add the AI chat widget to your Webflow site in minutes.
      </p>

      <h2 className="mt-12 text-xl font-semibold">Step 1: Open Site Settings</h2>
      <p className="text-muted-foreground mt-2 leading-relaxed">
        In your Webflow Designer, click the <strong>Site Settings</strong> gear icon in the left sidebar, then navigate to the <strong>Custom Code</strong> tab.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Step 2: Add to Head</h2>
      <p className="text-muted-foreground mt-2 leading-relaxed">
        Paste the script tag in the <strong>Head Code</strong> section:
      </p>
      <pre className="bg-muted mt-4 overflow-x-auto rounded-xl border border-border/50 p-4 text-sm leading-relaxed">
{`<script src="https://your-app.com/widget/widget.js"
  data-website-id="YOUR_WEBSITE_ID" defer></script>`}
      </pre>

      <h2 className="mt-10 text-xl font-semibold">Step 3: Publish</h2>
      <p className="text-muted-foreground mt-2 leading-relaxed">
        Click <strong>Save</strong> and then <strong>Publish</strong> your site. The widget will be active across all pages.
      </p>

      <div className="bg-amber-50 dark:bg-amber-900/20 mt-12 rounded-xl border border-amber-200/50 p-6">
        <div className="flex items-start gap-3">
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">Note</h3>
            <p className="text-amber-700 dark:text-amber-300 mt-1 text-sm">
              Webflow's custom code is applied globally. If you only want the widget on specific pages, use the <strong>Page Settings</strong> custom code section instead, or add conditional logic.
            </p>
          </div>
        </div>
      </div>

      <h2 className="mt-10 text-xl font-semibold">Conditional by Page</h2>
      <p className="text-muted-foreground mt-2 leading-relaxed">
        In the Webflow Designer, select a specific page, go to <strong>Page Settings → Custom Code</strong>, and paste the script there instead of the global head code.
      </p>
    </DocsLayout>
  );
}
