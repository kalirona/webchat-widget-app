import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import { getAgents, createWebsite } from "wasp/client/operations";
import { useNavigate } from "react-router";
import { routes, Link } from "wasp/client/router";
import { Globe, ArrowLeft, Loader2, Link2, Palette, Image, MessageSquare, AlertCircle, CheckCircle2 } from "lucide-react";
import { AppLayout } from "../layout/AppLayout";
import { Button } from "../../client/components/ui/button";
import {
  websiteFormSchema, websiteFormDefaults, PRESET_COLORS,
  type WebsiteFormData, formatWebsiteError, getDomainFromUrl,
} from "./constants";

export function NewWebsitePage({ user }: { user: AuthUser }) {
  const navigate = useNavigate();
  const { data: agents } = useQuery(getAgents);
  const [form, setForm] = useState<WebsiteFormData>(websiteFormDefaults);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const updateField = <K extends keyof WebsiteFormData>(key: K, value: WebsiteFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

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
      await createWebsite({
        url: result.data.url,
        name: result.data.name,
        logoUrl: result.data.logoUrl || undefined,
        agentId: result.data.agentId || undefined,
        widgetColor: result.data.widgetColor,
        widgetPosition: result.data.widgetPosition,
        widgetTitle: result.data.widgetTitle || "AI Assistant",
        widgetAvatarUrl: result.data.widgetAvatarUrl || undefined,
        widgetWelcomeMessage: result.data.widgetWelcomeMessage || undefined,
        allowedDomains: result.data.allowedDomains
          ? result.data.allowedDomains.split("\n").map((d) => d.trim()).filter(Boolean)
          : undefined,
      });
      navigate(routes.WebsitesRoute.to);
    } catch (err: unknown) {
      setServerError(formatWebsiteError(err));
    } finally {
      setSaving(false);
    }
  };

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
            <h1 className="text-3xl font-bold tracking-tight">Add Website</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Connect a website and deploy your AI chat widget
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
                  <div>
                    <label htmlFor="name" className="mb-2 block text-sm font-medium">
                      Website Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder="e.g., My Business Site"
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
                      placeholder="https://example.com"
                      className={`border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${errors.url ? "border-destructive" : ""}`}
                    />
                    {errors.url && <p className="text-destructive mt-1 text-xs">{errors.url}</p>}
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
                    <p className="text-muted-foreground mt-1 text-xs">
                      URL to your website logo. Used for display in the dashboard.
                    </p>
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
                      <option value="">Select an agent...</option>
                      {agents?.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
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
                          style={{
                            backgroundColor: color,
                            ...(form.widgetColor === color ? ({ '--tw-ring-color': color } as React.CSSProperties) : {}),
                          }}
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

              {/* Info */}
              <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold">How it works</h3>
                <ol className="space-y-3 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="bg-primary/10 text-primary mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">1</span>
                    Add your website details and configure the widget appearance
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary/10 text-primary mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">2</span>
                    Link an AI agent to handle conversations
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary/10 text-primary mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">3</span>
                    Copy the embed code and add it to your website
                  </li>
                </ol>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Link
                  to={routes.WebsitesRoute.to}
                  className="text-muted-foreground hover:text-foreground flex-1 text-center text-sm font-medium transition-colors"
                >
                  Cancel
                </Link>
                <Button
                  type="submit"
                  disabled={saving || !form.name.trim() || !form.url.trim()}
                  className="flex-1 rounded-xl"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Website
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
