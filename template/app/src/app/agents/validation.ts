import * as z from "zod";

export const agentFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less")
    .trim(),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional()
    .or(z.literal("")),
  model: z.string().min(1, "Model is required"),
  systemPrompt: z
    .string()
    .min(1, "System prompt is required")
    .max(10000, "System prompt must be 10,000 characters or less")
    .trim(),
  welcomeMessage: z
    .string()
    .max(500, "Welcome message must be 500 characters or less")
    .optional()
    .or(z.literal("")),
  temperature: z
    .number()
    .min(0, "Temperature must be at least 0")
    .max(2, "Temperature must be at most 2"),
  status: z.enum(["draft", "active", "paused"]).optional(),
});

export type AgentFormData = z.infer<typeof agentFormSchema>;

export const agentFormDefaults: AgentFormData = {
  name: "",
  description: "",
  model: "gpt-4o",
  systemPrompt: "You are a helpful AI assistant. Answer questions clearly and concisely. If you don't know the answer, say so honestly.",
  welcomeMessage: "Hello! How can I help you today?",
  temperature: 0.7,
};

export function formatAgentError(error: z.ZodError): string {
  const firstError = error.errors[0];
  if (firstError) {
    return firstError.message;
  }
  return "Validation failed";
}
