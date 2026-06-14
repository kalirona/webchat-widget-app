export const AI_MODELS = [
  { value: "gpt-4o", label: "GPT-4o", provider: "openai" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", provider: "openai" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo", provider: "openai" },
  { value: "gpt-4", label: "GPT-4", provider: "openai" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", provider: "openai" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "gemini" },
  { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite", provider: "gemini" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro", provider: "gemini" },
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash", provider: "gemini" },
] as const;

export type AIModelValue = (typeof AI_MODELS)[number]["value"];

export function getModelLabel(value: string): string {
  return AI_MODELS.find((m) => m.value === value)?.label ?? value;
}

export function getModelsByProvider(provider: string) {
  return AI_MODELS.filter((m) => m.provider === provider);
}

export const AGENT_STATUS = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground" },
  active: { label: "Active", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  paused: { label: "Paused", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
} as const;

export type AgentStatus = keyof typeof AGENT_STATUS;

export const DEFAULT_SYSTEM_PROMPT = "You are a helpful AI assistant. Answer questions clearly and concisely. If you don't know the answer, say so honestly.";

export const DEFAULT_WELCOME_MESSAGE = "Hello! How can I help you today?";
