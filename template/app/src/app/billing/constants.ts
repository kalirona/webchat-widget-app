export const PLAN_LIMITS = {
  free: {
    label: "Free",
    websites: 1,
    conversations: 100,
    tokens: 10000,
    members: 2,
    models: ["gpt-4o-mini", "gemini-1.5-flash"],
  },
  hobby: {
    label: "Hobby",
    websites: 3,
    conversations: 500,
    tokens: 100000,
    members: 5,
    models: ["gpt-4o-mini", "gpt-4o", "gemini-1.5-flash", "gemini-1.5-pro"],
  },
  pro: {
    label: "Pro",
    websites: 10,
    conversations: 5000,
    tokens: 2000000,
    members: 20,
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1", "o4-mini", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.5-pro"],
  },
  business: {
    label: "Business",
    websites: Infinity,
    conversations: Infinity,
    tokens: Infinity,
    members: Infinity,
    models: null as string[] | null, // null = all models allowed
  },
} as const;

export type PlanId = keyof typeof PLAN_LIMITS;

export function getPlanLimits(plan: string | null | undefined): typeof PLAN_LIMITS.free {
  if (plan && plan in PLAN_LIMITS) {
    return PLAN_LIMITS[plan as PlanId] as any;
  }
  return PLAN_LIMITS.free as any;
}

export function getAllowedModels(plan: string | null | undefined): string[] | null {
  if (plan && plan in PLAN_LIMITS) {
    const models = PLAN_LIMITS[plan as PlanId].models;
    return models ? [...models] as string[] : null;
  }
  return [...PLAN_LIMITS.free.models] as string[];
}

// Warn when usage hits 80% of limit
export function shouldWarnUsage(current: number, limit: number): boolean {
  if (limit === Infinity) return false;
  return current >= limit * 0.8;
}
