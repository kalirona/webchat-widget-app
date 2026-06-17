import { useState, useCallback } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery, useAction } from "wasp/client/operations";
import { getTriggers, createTrigger, updateTrigger, deleteTrigger, getWebsite } from "wasp/client/operations";
import { useParams, useNavigate } from "react-router";
import { Link, routes } from "wasp/client/router";
import { Bell, Plus, Trash2, Clock, MousePointer, LogOut, Globe, Loader2, Zap, ToggleLeft, ToggleRight, ChevronLeft, AlertCircle } from "lucide-react";
import { AppLayout } from "../layout/AppLayout";

const TRIGGER_TYPES = [
  { value: "time_on_page", label: "Time on Page", icon: Clock, desc: "Opens after visitor spends X seconds on page" },
  { value: "scroll_depth", label: "Scroll Depth", icon: MousePointer, desc: "Opens when visitor scrolls past X%" },
  { value: "exit_intent", label: "Exit Intent", icon: LogOut, desc: "Opens when mouse leaves the page" },
  { value: "page_visit", label: "Page Visit", icon: Globe, desc: "Opens on specific page URL match" },
];

export function TriggersPage({ user }: { user: AuthUser }) {
  const { websiteId } = useParams<{ websiteId: string }>();
  const navigate = useNavigate();
  const { data: website } = useQuery(getWebsite, { id: websiteId! });
  const { data: triggers, isLoading, refetch } = useQuery(getTriggers, { websiteId: websiteId! });
  const createAction = useAction(createTrigger);
  const updateAction = useAction(updateTrigger);
  const deleteAction = useAction(deleteTrigger);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("time_on_page");
  const [configSeconds, setConfigSeconds] = useState(15);
  const [configPercentage, setConfigPercentage] = useState(50);
  const [configUrlPattern, setConfigUrlPattern] = useState("");
  const [message, setMessage] = useState("");

  const resetForm = useCallback(() => {
    setName("");
    setType("time_on_page");
    setConfigSeconds(15);
    setConfigPercentage(50);
    setConfigUrlPattern("");
    setMessage("");
    setShowForm(false);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!name.trim() || !message.trim()) return;
    let config: Record<string, unknown> = {};
    if (type === "time_on_page") config = { seconds: configSeconds };
    else if (type === "scroll_depth") config = { percentage: configPercentage };
    else if (type === "page_visit") config = { urlPattern: configUrlPattern };
    try {
      await createAction({ websiteId: websiteId!, name: name.trim(), type, config, message: message.trim() });
      resetForm();
      refetch();
    } catch (err) {
      console.error("Failed to create trigger", err);
    }
  }, [name, type, configSeconds, configPercentage, configUrlPattern, message, websiteId, createAction, resetForm, refetch]);

  const handleToggle = useCallback(async (id: string, enabled: boolean) => {
    try {
      await updateAction({ id, enabled: !enabled });
      refetch();
    } catch {}
  }, [updateAction, refetch]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteAction({ id });
      refetch();
    } catch {}
  }, [deleteAction, refetch]);

  if (!websiteId) {
    return (
      <AppLayout user={user}>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <AlertCircle className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
            <p className="text-lg font-semibold">No website selected</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={user}>
      <div className="mb-6 flex items-center gap-4">
        <Link to={routes.WebsitesRoute.to} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Proactive Triggers</h1>
          <p className="text-muted-foreground mt-1 text-base">
            {website?.name ? `For ${website.name}` : "Auto-open widget based on visitor behavior"}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          </div>
        ) : !triggers || triggers.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border/50 p-12 text-center shadow-sm">
            <Bell className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
            <h2 className="text-xl font-semibold">No triggers configured</h2>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm">
              Proactive triggers auto-open the widget based on visitor behavior like time on page, scroll depth, or exit intent.
            </p>
            <button onClick={() => setShowForm(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-colors">
              <Plus className="h-4 w-4" /> Create your first trigger
            </button>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
              <h2 className="text-lg font-semibold">{triggers.length} trigger{triggers.length !== 1 ? "s" : ""}</h2>
              <button onClick={() => setShowForm(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors">
                <Plus className="h-4 w-4" /> Add trigger
              </button>
            </div>
            <div className="divide-y divide-border/50">
              {triggers.map((t: any) => {
                const typeInfo = TRIGGER_TYPES.find((tt) => tt.value === t.type);
                const TypeIcon = typeInfo?.icon || Zap;
                const configStr = t.type === "time_on_page" ? `${t.config?.seconds || 15}s` : t.type === "scroll_depth" ? `${t.config?.percentage || 50}%` : t.type === "exit_intent" ? "On exit" : t.config?.urlPattern || "";
                return (
                  <div key={t.id} className="flex items-center gap-4 px-6 py-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${t.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold ${!t.enabled && "text-muted-foreground"}`}>{t.name}</p>
                        <span className="text-muted-foreground text-xs">{typeInfo?.label || t.type}</span>
                        <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs">{configStr}</span>
                      </div>
                      <p className={`mt-0.5 line-clamp-1 text-sm ${t.enabled ? "" : "text-muted-foreground"}`}>{t.message}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggle(t.id, t.enabled)}
                        className="hover:bg-muted rounded-lg p-2 transition-colors"
                        title={t.enabled ? "Disable" : "Enable"}
                      >
                        {t.enabled ? <ToggleRight className="text-primary h-5 w-5" /> : <ToggleLeft className="text-muted-foreground h-5 w-5" />}
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="hover:bg-red-50 rounded-lg p-2 text-red-500 transition-colors dark:hover:bg-red-900/20" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold">New Trigger</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Trigger Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., Welcome offer after 15s"
                  className="bg-muted w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Trigger Type</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {TRIGGER_TYPES.map((tt) => {
                    const Icon = tt.icon;
                    const active = type === tt.value;
                    return (
                      <button
                        key={tt.value}
                        onClick={() => setType(tt.value)}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-xs transition-colors ${
                          active ? "border-primary bg-primary/5 text-primary" : "border-border/50 hover:border-muted-foreground/30 text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{tt.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-muted-foreground mt-2 text-xs">{TRIGGER_TYPES.find((tt) => tt.value === type)?.desc}</p>
              </div>

              {type === "time_on_page" && (
                <div>
                  <label className="mb-1 block text-sm font-medium">Seconds on page before trigger (seconds)</label>
                  <input
                    type="number"
                    min={3}
                    max={300}
                    value={configSeconds}
                    onChange={e => setConfigSeconds(Number(e.target.value))}
                    className="bg-muted w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}
              {type === "scroll_depth" && (
                <div>
                  <label className="mb-1 block text-sm font-medium">Scroll depth (%)</label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={configPercentage}
                    onChange={e => setConfigPercentage(Number(e.target.value))}
                    className="bg-muted w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}
              {type === "page_visit" && (
                <div>
                  <label className="mb-1 block text-sm font-medium">URL contains</label>
                  <input
                    value={configUrlPattern}
                    onChange={e => setConfigUrlPattern(e.target.value)}
                    placeholder="e.g., /pricing"
                    className="bg-muted w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium">Trigger Message</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="e.g., Need help choosing a plan? I'm here!"
                  rows={2}
                  className="bg-muted w-full resize-none rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="text-muted-foreground mt-1 text-xs">This message will be shown when the trigger fires</p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button onClick={handleCreate} disabled={!name.trim() || !message.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium transition-colors disabled:opacity-50">
                  <Zap className="h-4 w-4" /> Create Trigger
                </button>
                <button onClick={resetForm} className="hover:bg-muted rounded-xl px-6 py-2.5 text-sm font-medium transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
