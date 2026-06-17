import { DocsLayout } from "./DocsLayout";

export function WordPressDocPage() {
  return (
    <DocsLayout title="WordPress Integration">
      <h1 className="text-3xl font-bold tracking-tight">WordPress</h1>
      <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
        Integrate the AI chat widget with your WordPress site.
      </p>

      <h2 className="mt-12 text-xl font-semibold">Method 1: Theme Header (Recommended)</h2>
      <p className="text-muted-foreground mt-2 leading-relaxed">
        Add the script to your theme's <code className="bg-muted rounded px-1.5 py-0.5 text-sm font-mono">header.php</code> file just before the closing <code className="bg-muted rounded px-1.5 py-0.5 text-sm font-mono">&lt;/head&gt;</code> tag:
      </p>
      <pre className="bg-muted mt-4 overflow-x-auto rounded-xl border border-border/50 p-4 text-sm leading-relaxed">
{`<?php
// In header.php before </head>
?>
<script src="https://your-app.com/widget/widget.js"
  data-website-id="YOUR_WEBSITE_ID" defer></script>
<?php ?>`}
      </pre>

      <h2 className="mt-10 text-xl font-semibold">Method 2: Plugin</h2>
      <p className="text-muted-foreground mt-2 leading-relaxed">
        Use a "Header & Footer Scripts" plugin (like WPCode or Insert Headers and Footers) to add the script without editing your theme. Go to <strong>Settings → Insert Headers and Footers</strong> and paste the script in the header section.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Method 3: Child Theme</h2>
      <p className="text-muted-foreground mt-2 leading-relaxed">
        If using a child theme, add the script to <code className="bg-muted rounded px-1.5 py-0.5 text-sm font-mono">functions.php</code> using <code className="bg-muted rounded px-1.5 py-0.5 text-sm font-mono">wp_enqueue_script</code> or <code className="bg-muted rounded px-1.5 py-0.5 text-sm font-mono">wp_head</code> action hook.
      </p>
      <pre className="bg-muted mt-4 overflow-x-auto rounded-xl border border-border/50 p-4 text-sm leading-relaxed">
{`add_action('wp_head', function() { ?>
  <script src="https://your-app.com/widget/widget.js"
    data-website-id="YOUR_WEBSITE_ID" defer></script>
<?php });`}
      </pre>
    </DocsLayout>
  );
}
