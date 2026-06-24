import { useState, useEffect } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import { getWebsite, getAgents, updateWebsite } from "wasp/client/operations";
import { useNavigate, useParams } from "react-router";
import { routes, Link } from "wasp/client/router";
import {
  Globe, ArrowLeft, Loader2, Copy, Check, Palette, Link2, Image,
  MessageSquare, AlertCircle, Code2, Settings, ExternalLink, Zap,
} from "lucide-react";
import { AppLayout } from "../layout/AppLayout";
import { Button } from "../../client/components/ui/button";
import {
  websiteFormSchema, PRESET_COLORS,
  type WebsiteFormData, formatWebsiteError, getDomainFromUrl,
} from "./constants";

export function EditWebsitePage({ user }: { user: AuthUser }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: website, isLoading } = useQuery(getWebsite, { id: id! }) as any
  const { data: agents } = useQuery(getAgents) as any;

  const [form, setForm] = useState<WebsiteFormData>({
    name: "",
    url: "",
    logoUrl: "",
    agentId: "",
    widgetColor: "#6366f1",
    widgetPosition: "right",
    widgetTitle: "AI Assistant",
    widgetAvatarUrl: "",
    widgetWelcomeMessage: "",
    allowedDomains: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (website) {
      setForm({
        name: website.name || "",
        url: website.url || "",
        logoUrl: website.logoUrl || "",
        agentId: website.agentId || "",
        widgetColor: website.widgetColor || "#6366f1",
        widgetPosition: website.widgetPosition === "left" ? "left" : "right",
        widgetTitle: website.widgetTitle || "AI Assistant",
        widgetAvatarUrl: website.widgetAvatarUrl || "",
        widgetWelcomeMessage: website.widgetWelcomeMessage || "",
        allowedDomains: (website.allowedDomains || []).join("\n"),
      });
    }
  }, [website]);

  const embedCode = `<script src="${window.location.origin}/widget/widget.js" data-website-id="${id}" defer></script>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const updateField = <K extends keyof WebsiteFormData>(key: K, value: WebsiteFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSaved(false);

    const result = websiteFormSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        if (path && !fieldErrors[path]) fieldErrors[path] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    try {
      await updateWebsite({
        id: id!,
        url: result.data.url,
        name: result.data.name,
        logoUrl: result.data.logoUrl || undefined,
        agentId: result.data.agentId || undefined,
        widgetColor: result.data.widgetColor,
        widgetPosition: result.data.widgetPosition,
        widgetTitle: result.data.widgetTitle || "AI Assistant",
        widgetAvatarUrl: result.data.widgetAvatarUrl || undefined,
        widgetWelcomeMessage: result.data.widgetWelcomeMessage || "",
        allowedDomains: result.data.allowedDomains
          ? result.data.allowedDomains.split("\n").map((d) => d.trim()).filter(Boolean)
          : [],
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setServerError(formatWebsiteError(err));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout user={user}>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!website) {
    return (
      <AppLayout user={user}>
        <div className="flex h-full items-center justify-center">
          <div className="bg-card rounded-2xl p-10 shadow-lg text-center">
            <Globe className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
            <h2 className="text-xl font-bold">Website not found</h2>
            <p className="text-muted-foreground mt-2 mb-6 text-sm">The website you're looking for doesn't exist or has been removed.</p>
            <Link to={routes.WebsitesRoute.to} className="text-primary hover:underline text-sm font-medium">Back to Websites</Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={user}>
      <div className="mb-6">
        <Link
          to={routes.WebsitesRoute.to}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Websites
        </Link>
      </div>

      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="bg-primary/10 text-primary rounded-xl p-3">
            <Globe className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{website.name}</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
              <ExternalLink className="h-3.5 w-3.5" />
              {getDomainFromUrl(website.url)}
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                website.status === "active"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              }`}>
                {website.status === "active" ? "Active" : "Inactive"}
              </span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Website Details */}
              <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  Website Details
                </h2>

                {serverError && (
                  <div className="bg-destructive/10 text-destructive mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {serverError}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="name" className="mb-2 block text-sm font-medium">
                        Website Name <span className="text-destructive">*</span>
                      </label>
                      <input
                        id="name"
                        type="text"
                        value={form.name}
                        onChange={(e) => updateField("name", e.target.value)}
                        className={`border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${errors.name ? "border-destructive" : ""}`}
                      />
                      {errors.name && <p className="text-destructive mt-1 text-xs">{errors.name}</p>}
                    </div>
                    <div>
                      <label htmlFor="url" className="mb-2 block text-sm font-medium">
                        Website URL <span className="text-destructive">*</span>
                      </label>
                      <input
                        id="url"
                        type="url"
                        value={form.url}
                        onChange={(e) => updateField("url", e.target.value)}
                        className={`border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${errors.url ? "border-destructive" : ""}`}
                      />
                      {errors.url && <p className="text-destructive mt-1 text-xs">{errors.url}</p>}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="logoUrl" className="mb-2 block text-sm font-medium">
                      Logo URL <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <input
                      id="logoUrl"
                      type="url"
                      value={form.logoUrl || ""}
                      onChange={(e) => updateField("logoUrl", e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className={`border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${errors.logoUrl ? "border-destructive" : ""}`}
                    />
                    {errors.logoUrl && <p className="text-destructive mt-1 text-xs">{errors.logoUrl}</p>}
                  </div>

                  <div>
                    <label htmlFor="agent" className="mb-2 block text-sm font-medium">
                      AI Agent <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <select
                      id="agent"
                      value={form.agentId || ""}
                      onChange={(e) => updateField("agentId", e.target.value)}
                      className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    >
                      <option value="">No agent linked</option>
                      {agents?.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Widget Configuration */}
              <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  Widget Configuration
                </h2>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="widgetTitle" className="mb-2 block text-sm font-medium">
                      Widget Title <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <input
                      id="widgetTitle"
                      type="text"
                      value={form.widgetTitle || ""}
                      onChange={(e) => updateField("widgetTitle", e.target.value)}
                      placeholder="AI Assistant"
                      className={`border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${errors.widgetTitle ? "border-destructive" : ""}`}
                    />
                    {errors.widgetTitle && <p className="text-destructive mt-1 text-xs">{errors.widgetTitle}</p>}
                    <p className="text-muted-foreground mt-1 text-xs">
                      Displayed in the chat widget header
                    </p>
                  </div>

                  <div>
                    <label htmlFor="widgetAvatarUrl" className="mb-2 block text-sm font-medium">
                      Avatar Image URL <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <input
                      id="widgetAvatarUrl"
                      type="url"
                      value={form.widgetAvatarUrl || ""}
                      onChange={(e) => updateField("widgetAvatarUrl", e.target.value)}
                      placeholder="https://example.com/avatar.png"
                      className={`border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${errors.widgetAvatarUrl ? "border-destructive" : ""}`}
                    />
                    {errors.widgetAvatarUrl && <p className="text-destructive mt-1 text-xs">{errors.widgetAvatarUrl}</p>}
                    <p className="text-muted-foreground mt-1 text-xs">
                      Custom avatar shown in chat header. Leave empty for default.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">Primary Color</label>
                    <div className="flex flex-wrap items-center gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => updateField("widgetColor", color)}
                          className={`h-8 w-8 rounded-lg transition-all ${
                            form.widgetColor === color
                              ? "ring-2 ring-offset-2 ring-offset-background scale-110"
                              : "hover:scale-105"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                      <div className="ml-2 flex items-center gap-2">
                        <input
                          type="color"
                          value={form.widgetColor}
                          onChange={(e) => updateField("widgetColor", e.target.value)}
                          className="h-8 w-8 cursor-pointer rounded-lg border"
                        />
                        <input
                          type="text"
                          value={form.widgetColor}
                          onChange={(e) => updateField("widgetColor", e.target.value)}
                          className="border-input bg-background ring-offset-background focus-visible:ring-ring h-8 w-24 rounded-lg border px-2 text-xs font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">Bubble Position</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateField("widgetPosition", "right")}
                        className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                          form.widgetPosition === "right"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-input hover:bg-accent"
                        }`}
                      >
                        Bottom Right
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField("widgetPosition", "left")}
                        className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                          form.widgetPosition === "left"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-input hover:bg-accent"
                        }`}
                      >
                        Bottom Left
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="welcome" className="mb-2 block text-sm font-medium">
                      Welcome Message <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <textarea
                      id="welcome"
                      value={form.widgetWelcomeMessage || ""}
                      onChange={(e) => updateField("widgetWelcomeMessage", e.target.value)}
                      rows={3}
                      className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                      placeholder="Hello! How can I help you today?"
                    />
                  </div>

                  <div>
                    <label htmlFor="domains" className="mb-2 block text-sm font-medium">
                      Allowed Domains <span className="text-muted-foreground font-normal">(one per line, leave empty to allow all)</span>
                    </label>
                    <textarea
                      id="domains"
                      value={form.allowedDomains || ""}
                      onChange={(e) => updateField("allowedDomains", e.target.value)}
                      rows={3}
                      className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                      placeholder="example.com&#10;app.example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <Link to={routes.WebsitesRoute.to} className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors">
                  Cancel
                </Link>
                <Button type="submit" disabled={saving || !form.name.trim() || !form.url.trim()} className="rounded-xl">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {saved ? "Saved!" : "Save Changes"}
                </Button>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Widget Preview */}
              <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold">Widget Preview</h3>
                <div className="bg-muted/50 rounded-xl p-4">
                  {/* Chat Header */}
                  <div className="flex items-center gap-3 border-b border-border pb-3 mb-3">
                    {form.widgetAvatarUrl ? (
                      <img
                        src={form.widgetAvatarUrl}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full"
                        style={{ backgroundColor: form.widgetColor }}
                      >
                        <MessageSquare className="h-5 w-5 text-white" />
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-sm">{form.widgetTitle || "AI Assistant"}</div>
                      <div className="text-emerald-500 text-xs">● Online</div>
                    </div>
                  </div>
                  {/* Sample Message */}
                  <div className="space-y-3">
                    <div className="bg-background rounded-lg p-3 text-xs max-w-[80%]">
                      {form.widgetWelcomeMessage || "Hello! How can I help you today?"}
                    </div>
                    <div className="flex justify-end">
                      <div
                        className="rounded-lg p-3 text-xs text-white max-w-[80%]"
                        style={{ backgroundColor: form.widgetColor }}
                      >
                        Hi there!
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: form.widgetColor }} />
                  {form.widgetColor} &middot; {form.widgetPosition === "right" ? "Bottom Right" : "Bottom Left"}
                </div>
              </div>

              {/* Logo Preview */}
              {form.logoUrl && (
                <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
                  <h3 className="mb-4 text-sm font-semibold">Logo Preview</h3>
                  <div className="flex items-center justify-center rounded-xl bg-muted/50 p-6">
                    <img
                      src={form.logoUrl}
                      alt="Logo preview"
                      className="max-h-16 max-w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Embed Code */}
              <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Code2 className="h-4 w-4 text-muted-foreground" />
                  Embed Code
                </h3>
                <p className="text-muted-foreground mb-4 text-xs">
                  Add this to your website's <code className="bg-muted rounded px-1">&lt;head&gt;</code> tag.
                </p>
                <div className="bg-muted relative rounded-xl p-4">
                  <pre className="font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all">{embedCode}</pre>
                  <button
                    onClick={handleCopy}
                    className="absolute right-2 top-2 bg-background hover:bg-accent inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors border"
                  >
                    {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
                  </button>
                </div>
              </div>

              {/* Proactive Triggers */}
              <Link
                to={`/app/websites/${id}/triggers` as any}
                className="bg-card hover:bg-accent/50 rounded-2xl border border-border/50 p-6 shadow-sm transition-colors block"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 text-primary rounded-xl p-3">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Proactive Triggers</h3>
                    <p className="text-muted-foreground text-xs mt-0.5">Auto-open widget based on visitor behavior</p>
                  </div>
                </div>
              </Link>

              {/* Website Info */}
              <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold">Website Info</h3>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Created</dt>
                    <dd>{new Date(website.createdAt).toLocaleDateString()}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Domain</dt>
                    <dd className="truncate max-w-[160px]">{getDomainFromUrl(website.url)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Agent</dt>
                    <dd>{website.agentName || "None"}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}



