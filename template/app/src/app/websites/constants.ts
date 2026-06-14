import * as z from "zod";

export const websiteFormSchema = z.object({
  name: z
    .string()
    .min(1, "Website name is required")
    .max(100, "Website name must be 100 characters or less"),
  url: z
    .string()
    .min(1, "Website URL is required")
    .url("Please enter a valid URL (e.g., https://example.com)"),
  logoUrl: z
    .string()
    .url("Please enter a valid logo URL")
    .or(z.literal(""))
    .optional(),
  agentId: z.string().optional(),
  widgetColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Please enter a valid hex color"),
  widgetPosition: z.enum(["right", "left"]),
  widgetTitle: z.string().max(50, "Widget title must be 50 characters or less").optional(),
  widgetAvatarUrl: z.string().url("Please enter a valid avatar URL").or(z.literal("")).optional(),
  widgetWelcomeMessage: z
    .string()
    .max(500, "Welcome message must be 500 characters or less")
    .optional(),
  allowedDomains: z.string().optional(),
});

export type WebsiteFormData = z.infer<typeof websiteFormSchema>;

export const websiteFormDefaults: WebsiteFormData = {
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
};

export const WEBSITE_STATUS = {
  active: {
    label: "Active",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  inactive: {
    label: "Inactive",
    color: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
} as const;

export const PRESET_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6b7280",
];

export function formatWebsiteError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred";
}

export function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
