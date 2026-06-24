import { useParams, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery, useAction } from "wasp/client/operations";
import { getAgent, updateAgent } from "wasp/client/operations";
import { Link, useNavigate, useParams, routes } from "wasp/client/router";
import { Bot, ArrowLeft, Loader2, AlertCircle, Info, Trash2 } from "lucide-react";
import { AppLayout } from "../layout/AppLayout";
import { Button } from "../../client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../client/components/ui/dialog";
import { deleteAgent } from "wasp/client/operations";
import { AI_MODELS, AGENT_STATUS, type AgentStatus } from "./constants";
import { agentFormSchema, formatAgentError } from "./validation";

export function EditAgentPage({ user }: { user: AuthUser }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: agent, isLoading: agentLoading } = useQuery(getAgent, { id: id! });
  const updateAgentAction = useAction(updateAgent);
  const deleteAgentAction = useAction(deleteAgent);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [model, setModel] = useState("gpt-4o");
  const [status, setStatus] = useState<AgentStatus>("draft");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [temperature, setTemperature] = useState(0.7);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (agent && !initialized) {
      setName(agent.name);
      setDescription(agent.description || "");
      setModel(agent.model);
      setStatus(agent.status as AgentStatus);
      setSystemPrompt(agent.systemPrompt);
      setWelcomeMessage(agent.welcomeMessage || "");
      setTemperature(agent.temperature);
      setInitialized(true);
    }
  }, [agent, initialized]);

  const validateField = (fieldName: string, value: unknown) => {
    try {
      const shape = agentFormSchema.shape as Record<string, { safeParse: (v: unknown) => { success: boolean; error?: { errors: { message: string }[] } } }>;
      const fieldSchema = shape[fieldName];
      if (fieldSchema) {
        const result = fieldSchema.safeParse(value);
        if (!result.success) {
          setFieldErrors((prev) => ({ ...prev, [fieldName]: result.error?.issues[0]?.message || "Invalid" }));
        } else {
          setFieldErrors((prev) => {
            const next = { ...prev };
            delete next[fieldName];
            return next;
          });
        }
      }
    } catch {
      // Field not in schema
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const formData = {
      name: name.trim(),
      description: description.trim() || undefined,
      model,
      status,
      systemPrompt: systemPrompt.trim(),
      welcomeMessage: welcomeMessage.trim() || undefined,
      temperature,
    };

    const validation = agentFormSchema.safeParse(formData);
    if (!validation.success) {
      setError(formatAgentError(validation.error));
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((err) => {
        const field = err.path[0];
        if (typeof field === "string") {
          errors[field] = err.message;
        }
      });
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    try {
      await updateAgentAction({ id: id!, ...validation.data });
      navigate(`/app/agents/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update agent");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAgentAction({ id: id! });
      navigate("/app/agents");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete agent");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (agentLoading) {
    return (
      <AppLayout user={user}>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!agent) {
    return (
      <AppLayout user={user}>
        <div className="flex flex-col items-center justify-center py-24">
          <div className="bg-muted/50 mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
            <Bot className="text-muted-foreground h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Agent Not Found</h2>
          <p className="text-muted-foreground mt-3 mb-6 text-base">
            The agent you're looking for doesn't exist or has been deleted.
          </p>
          <Link
            to={routes.AgentsRoute.to}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Agents
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to={routes.AgentsRoute.to}
            className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Agents
          </Link>
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Edit Agent</h1>
          <p className="text-muted-foreground mt-2 text-base lg:text-lg">
            Configure your AI agent settings
          </p>
        </div>
        <Button
          variant="destructive"
          onClick={() => setDeleteDialogOpen(true)}
          className="rounded-xl"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Agent
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Error Alert */}
        {error && (
          <div className="bg-destructive/10 text-destructive mb-6 flex items-center gap-3 rounded-2xl px-5 py-4">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Settings - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info Card */}
            <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-5">Basic Information</h2>
              <div className="space-y-5">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="mb-2 block text-sm font-medium">
                    Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      validateField("name", e.target.value);
                    }}
                    placeholder="e.g., Customer Support Agent"
                    className={`border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring h-11 w-full rounded-xl border px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                      fieldErrors.name ? "border-destructive" : ""
                    }`}
                    maxLength={100}
                  />
                  <div className="mt-1.5 flex items-center justify-between">
                    {fieldErrors.name ? (
                      <p className="text-destructive text-xs">{fieldErrors.name}</p>
                    ) : (
                      <span />
                    )}
                    <span className="text-muted-foreground text-xs">{name.length}/100</span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="mb-2 block text-sm font-medium">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      validateField("description", e.target.value);
                    }}
                    placeholder="Briefly describe what this agent does..."
                    rows={3}
                    className={`border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-xl border px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                      fieldErrors.description ? "border-destructive" : ""
                    }`}
                    maxLength={500}
                  />
                  <div className="mt-1.5 flex items-center justify-between">
                    {fieldErrors.description ? (
                      <p className="text-destructive text-xs">{fieldErrors.description}</p>
                    ) : (
                      <span />
                    )}
                    <span className="text-muted-foreground text-xs">{description.length}/500</span>
                  </div>
                </div>

                {/* Welcome Message */}
                <div>
                  <label htmlFor="welcomeMessage" className="mb-2 block text-sm font-medium">
                    Welcome Message
                  </label>
                  <input
                    id="welcomeMessage"
                    type="text"
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    placeholder="First message visitors see..."
                    className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring h-11 w-full rounded-xl border px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    maxLength={500}
                  />
                  <p className="text-muted-foreground mt-1.5 text-xs">
                    The greeting message shown when a conversation starts
                  </p>
                </div>
              </div>
            </div>

            {/* System Prompt Card */}
            <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold">System Prompt</h2>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Info className="h-4 w-4" />
                  <span className="text-xs">Controls agent behavior</span>
                </div>
              </div>
              <textarea
                value={systemPrompt}
                onChange={(e) => {
                  setSystemPrompt(e.target.value);
                  validateField("systemPrompt", e.target.value);
                }}
                placeholder="Instructions for how the AI should behave..."
                rows={10}
                className={`border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-xl border px-4 py-3 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                  fieldErrors.systemPrompt ? "border-destructive" : ""
                }`}
              />
              <div className="mt-1.5 flex items-center justify-between">
                {fieldErrors.systemPrompt ? (
                  <p className="text-destructive text-xs">{fieldErrors.systemPrompt}</p>
                ) : (
                  <span />
                )}
                <span className="text-muted-foreground text-xs">{systemPrompt.length}</span>
              </div>
            </div>
          </div>

          {/* Right Column - Model & Settings */}
          <div className="space-y-6">
            {/* Model Selection Card */}
            <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-5">Model & Behavior</h2>
              <div className="space-y-5">
                {/* Status */}
                <div>
                  <label htmlFor="status" className="mb-2 block text-sm font-medium">
                    Status
                  </label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as AgentStatus)}
                    className="border-input bg-background focus-visible:ring-ring flex h-11 w-full rounded-xl border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  >
                    {Object.entries(AGENT_STATUS).map(([value, { label }]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Model */}
                <div>
                  <label htmlFor="model" className="mb-2 block text-sm font-medium">
                    AI Model <span className="text-destructive">*</span>
                  </label>
                  <select
                    id="model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="border-input bg-background focus-visible:ring-ring flex h-11 w-full rounded-xl border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  >
                    <optgroup label="OpenAI">
                      {AI_MODELS.filter((m) => m.provider === "openai").map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Google Gemini">
                      {AI_MODELS.filter((m) => m.provider === "gemini").map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Temperature */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label htmlFor="temperature" className="text-sm font-medium">
                      Temperature
                    </label>
                    <span className="bg-muted rounded-lg px-2.5 py-1 text-sm font-mono font-semibold">
                      {temperature.toFixed(1)}
                    </span>
                  </div>
                  <input
                    id="temperature"
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="accent-primary w-full"
                  />
                  <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                    <span>Precise (0)</span>
                    <span>Creative (2)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
              <Button
                type="submit"
                disabled={saving || !name.trim()}
                className="h-11 w-full rounded-xl text-sm font-semibold shadow-lg shadow-primary/25"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
              <p className="text-muted-foreground mt-3 text-center text-xs">
                Last updated: {new Date(agent.updatedAt).toLocaleDateString()}
              </p>
            </div>

            {/* Agent Info */}
            <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
              <h3 className="text-sm font-semibold mb-3">Agent Info</h3>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Created</span>
                  <span>{new Date(agent.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Websites</span>
                  <span>{agent.websiteCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Conversations</span>
                  <span>{agent.conversationCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{agent.name}</strong>? This action cannot be undone.
              All associated conversations will be preserved but unlinked from this agent.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}



