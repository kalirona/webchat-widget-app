import { useNavigate } from "react-router";
import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useAction } from "wasp/client/operations";
import { createAgent } from "wasp/client/operations";
import { Link, useNavigate, routes } from "wasp/client/router";
import { Bot, ArrowLeft, Loader2, AlertCircle, Info } from "lucide-react";
import { AppLayout } from "../layout/AppLayout";
import { Button } from "../../client/components/ui/button";
import { AI_MODELS, DEFAULT_SYSTEM_PROMPT, DEFAULT_WELCOME_MESSAGE } from "./constants";
import { agentFormSchema, formatAgentError } from "./validation";

export function NewAgentPage({ user }: { user: AuthUser }) {
  const navigate = useNavigate();
  const createAgentAction = useAction(createAgent);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [model, setModel] = useState("gpt-4o");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [welcomeMessage, setWelcomeMessage] = useState(DEFAULT_WELCOME_MESSAGE);
  const [temperature, setTemperature] = useState(0.7);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateField = (fieldName: string, value: unknown) => {
    try {
      const result = agentFormSchema.shape[fieldName as keyof typeof agentFormSchema.shape]?.safeParse(value);
      if (result && !result.success) {
        setFieldErrors((prev) => ({ ...prev, [fieldName]: result.error.issues[0]?.message || "Invalid" }));
      } else {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next[fieldName];
          return next;
        });
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
      systemPrompt: systemPrompt.trim(),
      welcomeMessage: welcomeMessage.trim() || undefined,
      temperature,
    };

    const validation = agentFormSchema.safeParse(formData);
    if (!validation.success) {
      setError(formatAgentError(validation.error));
      // Set individual field errors
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
      const agent = await createAgentAction(validation.data);
      navigate(`/app/agents/${agent.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div className="mb-8">
        <Link
          to={routes.AgentsRoute.to}
          className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Agents
        </Link>
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Create Agent</h1>
        <p className="text-muted-foreground mt-2 text-base lg:text-lg">
          Set up a new AI agent to engage with your website visitors
        </p>
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
                rows={8}
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
                    Creating Agent...
                  </>
                ) : (
                  <>
                    <Bot className="mr-2 h-4 w-4" />
                    Create Agent
                  </>
                )}
              </Button>
              <p className="text-muted-foreground mt-3 text-center text-xs">
                Agent will be created in draft status
              </p>
            </div>
          </div>
        </div>
      </form>
    </AppLayout>
  );
}



