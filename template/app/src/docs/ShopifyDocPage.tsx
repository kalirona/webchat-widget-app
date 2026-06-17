import { DocsLayout } from "./DocsLayout";

export function ShopifyDocPage() {
  return (
    <DocsLayout title="Shopify Integration">
      <h1 className="text-3xl font-bold tracking-tight">Shopify</h1>
      <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
        Add the AI chat widget to your Shopify store.
      </p>

      <h2 className="mt-12 text-xl font-semibold">Step 1: Edit Theme Code</h2>
      <p className="text-muted-foreground mt-2 leading-relaxed">
        From your Shopify admin, go to <strong>Online Store → Themes → Edit Code</strong>.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Step 2: Add to theme.liquid</h2>
      <p className="text-muted-foreground mt-2 leading-relaxed">
        Open <code className="bg-muted rounded px-1.5 py-0.5 text-sm font-mono">theme.liquid</code> and paste the script tag just before the closing <code className="bg-muted rounded px-1.5 py-0.5 text-sm font-mono">&lt;/head&gt;</code> tag:
      </p>
      <pre className="bg-muted mt-4 overflow-x-auto rounded-xl border border-border/50 p-4 text-sm leading-relaxed">
{`<script src="https://your-app.com/widget/widget.js"
  data-website-id="YOUR_WEBSITE_ID" defer></script>`}
      </pre>

      <h2 className="mt-10 text-xl font-semibold">Step 3: Save and Verify</h2>
      <p className="text-muted-foreground mt-2 leading-relaxed">
        Click <strong>Save</strong> and visit your store. The chat widget should appear in the bottom corner. Test it by sending a message.
      </p>

      <div className="bg-primary/5 border-primary/30 mt-12 rounded-xl border p-6">
        <h3 className="font-semibold text-primary">Tip</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          For Shopify storefronts using the Online Store 2.0 theme architecture, you can also add the script via the <strong>Customize → Theme settings → Custom scripts</strong> section if your theme supports it.
        </p>
      </div>
    </DocsLayout>
  );
}
