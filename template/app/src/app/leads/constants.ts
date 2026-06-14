import * as z from "zod";

export const LEAD_STATUS = {
  new: {
    label: "New",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  contacted: {
    label: "Contacted",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  closed: {
    label: "Closed",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
} as const;

export type LeadStatus = keyof typeof LEAD_STATUS;

export const LEAD_STATUS_OPTIONS = Object.entries(LEAD_STATUS).map(([value, { label }]) => ({
  value,
  label,
}));

export const updateLeadSchema = z.object({
  id: z.string(),
  name: z.string().max(100).optional(),
  email: z.string().email().or(z.literal("")).optional(),
  phone: z.string().max(30).or(z.literal("")).optional(),
  status: z.enum(["new", "contacted", "closed"]).optional(),
  notes: z.string().max(1000).optional(),
});

export type UpdateLeadData = z.infer<typeof updateLeadSchema>;

export const deleteLeadSchema = z.object({
  id: z.string(),
});

export function formatLeadError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred";
}
