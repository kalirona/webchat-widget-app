import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import {
  getOrganization,
  getOrganizationMembers,
  getAiSettings,
  getAiUsage,
  updateOrganization,
  updateAiSettings,
  removeMember,
  getInvitations,
  sendInvitation,
  cancelInvitation,
  getAuditLogs,
  verifyOrganizationSlug,
} from "wasp/client/operations";
import {
  Settings,
  Loader2,
  UserPlus,
  Trash2,
  Building2,
  Cpu,
  Key,
  Database,
  AlertCircle,
  CheckCircle2,
  Globe,
  Link2,
  Users,
  FileText,
  Clock,
  X,
  Mail,
  Copy,
  ExternalLink,
  CreditCard,
  Palette,
  Image,
  Shield,
  Check,
} from "lucide-react";
import { AppLayout } from "../layout/AppLayout";
import { Button } from "../../client/components/ui/button";

const PROVIDER_MODELS: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"],
  gemini: ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro", "gemini-1.5-flash"],
};

type Tab = "organization" | "team" | "invitations" | "audit";

export function AppSettingsPage({ user }: { user: AuthUser }) {
  const { data: org, isLoading: orgLoading } = useQuery(getOrganization);
  const { data: members, isLoading: membersLoading } = useQuery(getOrganizationMembers);
  const { data: aiSettings, isLoading: aiLoading } = useQuery(getAiSettings);
  const { data: aiUsage, isLoading: usageLoading } = useQuery(getAiUsage);
  const { data: invitations, isLoading: invitationsLoading } = useQuery(getInvitations);
  const { data: auditData, isLoading: auditLoading } = useQuery(getAuditLogs, { limit: 20 });

  const [activeTab, setActiveTab] = useState<Tab>("organization");

  // Organization form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [logo, setLogo] = useState("");
  const [branding, setBranding] = useState<{ primaryColor: string; accentColor: string; companyName: string; hideBranding: boolean }>({
    primaryColor: "#6366f1",
    accentColor: "#8b5cf6",
    companyName: "",
    hideBranding: false,
  });
  const [nameLoaded, setNameLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  // Invitation form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  // AI settings state
  const [aiProvider, setAiProvider] = useState("openai");
  const [aiModel, setAiModel] = useState("gpt-4o");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [monthlyTokenLimit, setMonthlyTokenLimit] = useState("");
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSaveSuccess, setAiSaveSuccess] = useState(false);
  const [aiSaveError, setAiSaveError] = useState<string | null>(null);
  const [aiSettingsLoaded, setAiSettingsLoaded] = useState(false);

  if (org && !nameLoaded) {
    setName(org.name);
    setSlug(org.slug || "");
    setCustomDomain(org.customDomain || "");
    setLogo(org.logo || "");
    if (org.branding && typeof org.branding === "object") {
      const b = org.branding as Record<string, unknown>;
      setBranding({
        primaryColor: (b.primaryColor as string) || "#6366f1",
        accentColor: (b.accentColor as string) || "#8b5cf6",
        companyName: (b.companyName as string) || "",
        hideBranding: (b.hideBranding as boolean) || false,
      });
    }
    setNameLoaded(true);
  }

  if (aiSettings && !aiSettingsLoaded) {
    setAiProvider(aiSettings.aiProvider);
    setAiModel(aiSettings.aiModel);
    setOpenaiApiKey(aiSettings.openaiApiKey || "");
    setGeminiApiKey(aiSettings.geminiApiKey || "");
    setMonthlyTokenLimit(aiSettings.monthlyTokenLimit?.toString() || "");
    setAiSettingsLoaded(true);
  }

  const handleSlugChange = async (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    setSlug(sanitized);
    if (sanitized.length >= 3) {
      setCheckingSlug(true);
      try {
        const result = await verifyOrganizationSlug({ slug: sanitized });
        setSlugAvailable(result.available);
      } catch {
        setSlugAvailable(null);
      } finally {
        setCheckingSlug(false);
      }
    } else {
      setSlugAvailable(null);
    }
  };

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await updateOrganization({
        name: name.trim(),
        slug: slug || undefined,
        customDomain: customDomain || undefined,
        logo: logo || undefined,
        branding,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(false);
    try {
      await sendInvitation({ email: inviteEmail.trim() });
      setInviteEmail("");
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 3000);
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await cancelInvitation({ invitationId });
    } catch {
      // handled by re-render
    }
  };

  const handleRemove = async (userId: string) => {
    setRemovingUserId(userId);
    try {
      await removeMember({ userId });
    } catch {
      // handled by re-render
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleSaveAi = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiSaving(true);
    setAiSaveError(null);
    setAiSaveSuccess(false);
    try {
      await updateAiSettings({
        aiProvider,
        aiModel,
        openaiApiKey: openaiApiKey || undefined,
        geminiApiKey: geminiApiKey || undefined,
        monthlyTokenLimit: monthlyTokenLimit ? parseInt(monthlyTokenLimit) : null,
      });
      setAiSaveSuccess(true);
      setTimeout(() => setAiSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setAiSaveError(err instanceof Error ? err.message : "Failed to save AI settings");
    } finally {
      setAiSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const currentModels = PROVIDER_MODELS[aiProvider] || PROVIDER_MODELS.openai;

  if (orgLoading) {
    return (
      <AppLayout user={user}>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={user}>
      <div className="mb-8 flex items-center gap-4">
        <div className="bg-primary/10 text-primary rounded-lg p-3">
          <Settings className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-title-md font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm">
            Manage your organization, team, and billing settings
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b">
        <nav className="flex gap-6">
          {([
            { id: "organization", label: "Organization", icon: Building2 },
            { id: "team", label: "Team & Invitations", icon: Users },
            { id: "audit", label: "Audit Log", icon: FileText },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Organization Tab */}
      {activeTab === "organization" && (
        <div className="space-y-6">
          <div className="bg-card rounded-lg border p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <Building2 className="text-primary h-5 w-5" />
              <h2 className="text-title-sm font-semibold">Organization Details</h2>
            </div>
            <form onSubmit={handleSaveOrg} className="space-y-4">
              {saveError && (
                <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg px-4 py-3 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {saveError}
                </div>
              )}
              {saveSuccess && (
                <div className="bg-success/10 text-success flex items-center gap-2 rounded-lg px-4 py-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  Organization updated successfully
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="orgName" className="mb-2 block text-sm font-medium">
                    Organization Name
                  </label>
                  <input
                    id="orgName"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  />
                </div>
                <div>
                  <label htmlFor="orgSlug" className="mb-2 block text-sm font-medium">
                    <Link2 className="text-muted-foreground mr-1 inline h-3.5 w-3.5" />
                    Organization Slug
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="orgSlug"
                      type="text"
                      value={slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="my-org"
                      className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    />
                    {checkingSlug && <Loader2 className="h-4 w-4 animate-spin" />}
                    {!checkingSlug && slugAvailable === true && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    {!checkingSlug && slugAvailable === false && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {slug ? `${slug}.app.com` : "Used for subdomain routing"}
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="customDomain" className="mb-2 block text-sm font-medium">
                  <Globe className="text-muted-foreground mr-1 inline h-3.5 w-3.5" />
                  Custom Domain
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="customDomain"
                    type="text"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="app.yourdomain.com"
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  />
                  {customDomain && (
                    org?.domainVerified ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        <CheckCircle2 className="h-4 w-4" />
                        Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 whitespace-nowrap">
                        <AlertCircle className="h-4 w-4" />
                        Pending
                      </span>
                    )
                  )}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Configure DNS CNAME to point to our servers. Add a CNAME record for <code className="bg-muted rounded px-1">{customDomain || "app.yourdomain.com"}</code> → <code className="bg-muted rounded px-1">cname.vercel-dns.com</code>
                </p>
              </div>

              <div className="border-t pt-4">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  <Image className="h-4 w-4 text-muted-foreground" />
                  Organization Logo
                </h3>
                <div>
                  <label htmlFor="logo" className="mb-2 block text-sm font-medium">
                    Logo URL
                  </label>
                  <input
                    id="logo"
                    type="url"
                    value={logo}
                    onChange={(e) => setLogo(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  />
                  <p className="text-muted-foreground mt-1 text-xs">
                    Displayed in the sidebar and top bar. Use a square image (recommended: 200x200px).
                  </p>
                </div>
                {logo && (
                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={logo}
                      alt="Logo preview"
                      className="h-12 w-12 rounded-xl object-contain ring-1 ring-border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <span className="text-muted-foreground text-xs">Preview</span>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  Branding
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="primaryColor" className="mb-2 block text-sm font-medium">
                      Primary Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="primaryColor"
                        type="color"
                        value={branding.primaryColor}
                        onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                        className="h-10 w-10 cursor-pointer rounded-md border"
                      />
                      <input
                        type="text"
                        value={branding.primaryColor}
                        onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                        className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="accentColor" className="mb-2 block text-sm font-medium">
                      Accent Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="accentColor"
                        type="color"
                        value={branding.accentColor}
                        onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                        className="h-10 w-10 cursor-pointer rounded-md border"
                      />
                      <input
                        type="text"
                        value={branding.accentColor}
                        onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                        className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <label htmlFor="companyName" className="mb-2 block text-sm font-medium">
                    Company Name <span className="text-muted-foreground font-normal">(for white-label)</span>
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    value={branding.companyName}
                    onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
                    placeholder="Your Company Name"
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  />
                  <p className="text-muted-foreground mt-1 text-xs">
                    Used in widget headers and email templates.
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="text-sm font-medium">White-label mode</p>
                    <p className="text-muted-foreground text-xs">
                      Remove "Powered by AI Agent" branding from the widget
                    </p>
                    {org && (!org.subscriptionPlan || org.subscriptionPlan === "free" || org.subscriptionPlan === "hobby") && (
                      <p className="text-amber-600 dark:text-amber-400 mt-1 text-xs font-medium">
                        Available on Pro and Business plans only
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (org && (org.subscriptionPlan === "free" || org.subscriptionPlan === "hobby" || !org.subscriptionPlan)) return;
                      setBranding({ ...branding, hideBranding: !branding.hideBranding });
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      org && (org.subscriptionPlan === "free" || org.subscriptionPlan === "hobby" || !org.subscriptionPlan)
                        ? "bg-muted cursor-not-allowed opacity-50"
                        : branding.hideBranding ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        branding.hideBranding ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Branding Preview */}
              <div className="border-t pt-4">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  <Check className="h-4 w-4 text-muted-foreground" />
                  Preview
                </h3>
                <div className="bg-muted/50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    {logo ? (
                      <img src={logo} alt="" className="h-10 w-10 rounded-lg object-contain" />
                    ) : (
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-white text-sm font-bold"
                        style={{ backgroundColor: branding.primaryColor }}
                      >
                        {(branding.companyName || name || "A").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold">{branding.companyName || name || "Your Org"}</p>
                      <p className="text-muted-foreground text-xs">{branding.hideBranding ? "White-label" : "Powered by AI Agent"}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <div className="h-8 w-8 rounded-lg" style={{ backgroundColor: branding.primaryColor }} />
                    <div className="h-8 w-8 rounded-lg" style={{ backgroundColor: branding.accentColor }} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={saving || !name.trim()}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </div>

          {/* Usage Limits */}
          <div className="bg-card rounded-lg border p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <Database className="text-primary h-5 w-5" />
              <h2 className="text-title-sm font-semibold">Usage & Limits</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">Conversations This Month</p>
                <p className="text-2xl font-bold">{org?.conversationsThisMonth ?? 0}</p>
                <p className="text-muted-foreground text-xs">
                  of {org?.monthlyConversationLimit ?? "Unlimited"} limit
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">Team Members</p>
                <p className="text-2xl font-bold">{members?.length ?? 0}</p>
                <p className="text-muted-foreground text-xs">
                  of {org?.memberLimit ?? "Unlimited"} limit
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">AI Tokens (30 days)</p>
                <p className="text-2xl font-bold">
                  {aiUsage ? (aiUsage.totals.promptTokens + aiUsage.totals.completionTokens).toLocaleString() : 0}
                </p>
                <p className="text-muted-foreground text-xs">
                  of {org?.monthlyTokenLimit?.toLocaleString() ?? "Unlimited"} limit
                </p>
              </div>
            </div>
          </div>

          {/* Subscription */}
          <div className="bg-card rounded-lg border p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <CreditCard className="text-primary h-5 w-5" />
              <h2 className="text-title-sm font-semibold">Subscription</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  Current Plan: <span className="capitalize">{org?.subscriptionPlan ?? "Free Trial"}</span>
                </p>
                <p className="text-muted-foreground text-sm">
                  Status: <span className="capitalize">{org?.subscriptionStatus ?? "Active"}</span>
                </p>
                {org?.trialEndsAt && (
                  <p className="text-muted-foreground text-sm">
                    Trial ends: {new Date(org.trialEndsAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Button variant="outline" disabled>
                Manage Subscription
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Team Tab */}
      {activeTab === "team" && (
        <div className="space-y-6">
          {/* Team Members */}
          <div className="bg-card rounded-lg border p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <Users className="text-primary h-5 w-5" />
              <h2 className="text-title-sm font-semibold">Team Members</h2>
            </div>

            {membersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {members?.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium">
                        {member.username
                          ? member.username.charAt(0).toUpperCase()
                          : "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {member.username || "Unknown"}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {member.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-medium capitalize">
                        {member.role}
                      </span>
                      {member.role !== "owner" && (
                        <button
                          onClick={() => handleRemove(member.id)}
                          disabled={removingUserId === member.id}
                          className="hover:text-destructive text-muted-foreground transition-colors"
                          title="Remove member"
                        >
                          {removingUserId === member.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Invitations */}
          <div className="bg-card rounded-lg border p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <Mail className="text-primary h-5 w-5" />
              <h2 className="text-title-sm font-semibold">Pending Invitations</h2>
            </div>

            <form onSubmit={handleInvite} className="mb-6">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 flex-1 rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                />
                <Button type="submit" disabled={inviting || !inviteEmail.trim()}>
                  {inviting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  Send Invitation
                </Button>
              </div>
              {inviteError && (
                <p className="text-destructive mt-2 text-sm">{inviteError}</p>
              )}
              {inviteSuccess && (
                <p className="text-success mt-2 text-sm">Invitation sent successfully!</p>
              )}
            </form>

            {invitationsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
              </div>
            ) : invitations && invitations.length > 0 ? (
              <div className="space-y-2">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-lg border px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{inv.email}</p>
                      <p className="text-muted-foreground text-xs">
                        Invited by {inv.invitedBy} · Expires {new Date(inv.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-medium capitalize">
                        {inv.role}
                      </span>
                      <button
                        onClick={() => handleCancelInvitation(inv.id)}
                        className="hover:text-destructive text-muted-foreground transition-colors"
                        title="Cancel invitation"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center text-sm py-4">
                No pending invitations
              </p>
            )}
          </div>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === "audit" && (
        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <FileText className="text-primary h-5 w-5" />
            <h2 className="text-title-sm font-semibold">Audit Log</h2>
          </div>

          {auditLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
            </div>
          ) : auditData && auditData.logs.length > 0 ? (
            <div className="space-y-2">
              {auditData.logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded-lg border px-4 py-3"
                >
                  <Clock className="text-muted-foreground mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{log.action}</span>
                      <span className="text-muted-foreground text-xs">
                        by {log.user}
                      </span>
                    </div>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {JSON.stringify(log.metadata)}
                      </p>
                    )}
                  </div>
                  <span className="text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center text-sm py-8">
              No audit logs yet
            </p>
          )}
        </div>
      )}

      {/* AI Settings (Always visible at bottom) */}
      <div className="bg-card mt-6 rounded-lg border p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <Cpu className="text-primary h-5 w-5" />
          <h2 className="text-title-sm font-semibold">AI Provider Configuration</h2>
        </div>

        {aiLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSaveAi} className="space-y-5">
            {aiSaveError && (
              <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg px-4 py-3 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {aiSaveError}
              </div>
            )}
            {aiSaveSuccess && (
              <div className="bg-success/10 text-success flex items-center gap-2 rounded-lg px-4 py-3 text-sm">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                AI settings saved successfully
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">AI Provider</label>
                <select value={aiProvider} onChange={(e) => { setAiProvider(e.target.value); setAiModel(PROVIDER_MODELS[e.target.value]?.[0] || "gpt-4o"); }}
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2">
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Google Gemini</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Model</label>
                <select value={aiModel} onChange={(e) => setAiModel(e.target.value)}
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2">
                  {currentModels.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  <Key className="text-muted-foreground mr-1 inline h-3.5 w-3.5" />
                  OpenAI API Key
                </label>
                <input type="password" value={openaiApiKey} onChange={(e) => setOpenaiApiKey(e.target.value)}
                  placeholder={aiProvider === "openai" ? "sk-..." : "Not used with Gemini"}
                  disabled={aiProvider !== "openai"}
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  <Key className="text-muted-foreground mr-1 inline h-3.5 w-3.5" />
                  Gemini API Key
                </label>
                <input type="password" value={geminiApiKey} onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder={aiProvider === "gemini" ? "AIza..." : "Not used with OpenAI"}
                  disabled={aiProvider !== "gemini"}
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  <Database className="text-muted-foreground mr-1 inline h-3.5 w-3.5" />
                  Monthly Token Limit
                </label>
                <input type="number" value={monthlyTokenLimit} onChange={(e) => setMonthlyTokenLimit(e.target.value)}
                  placeholder="No limit"
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              {aiUsage && (
                <div className="text-muted-foreground text-xs">
                  Usage (30 days): {aiUsage.totals.promptTokens.toLocaleString()} prompt · {aiUsage.totals.completionTokens.toLocaleString()} completion tokens · ${aiUsage.totals.cost.toFixed(4)} cost
                </div>
              )}
              <Button type="submit" disabled={aiSaving}>
                {aiSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save AI Settings
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
