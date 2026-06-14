export const PLAN_LIMITS = {
  free: {
    label: "Free",
    websites: 1,
    conversations: 100,
    tokens: 10000,
    members: 2,
  },
  pro: {
    label: "Pro",
    websites: 5,
    conversations: 2000,
    tokens: 500000,
    members: 10,
  },
  business: {
    label: "Business",
    websites: Infinity,
    conversations: Infinity,
    tokens: Infinity,
    members: Infinity,
  },
} as const;

export type PlanId = keyof typeof PLAN_LIMITS;

export function getPlanLimits(plan: string | null | undefined): typeof PLAN_LIMITS.free {
  if (plan && plan in PLAN_LIMITS) {
    return PLAN_LIMITS[plan as PlanId];
  }
  return PLAN_LIMITS.free;
}
