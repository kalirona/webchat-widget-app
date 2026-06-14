type ModelPricing = {
  input: number;
  output: number;
};

const PRICING: Record<string, ModelPricing> = {
  "gpt-4o": { input: 2.5 / 1_000_000, output: 10 / 1_000_000 },
  "gpt-4o-mini": { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
  "gpt-4-turbo": { input: 10 / 1_000_000, output: 30 / 1_000_000 },
  "gpt-4": { input: 30 / 1_000_000, output: 60 / 1_000_000 },
  "gpt-3.5-turbo": { input: 0.5 / 1_000_000, output: 1.5 / 1_000_000 },
  "gemini-2.0-flash": { input: 0.1 / 1_000_000, output: 0.4 / 1_000_000 },
  "gemini-2.0-flash-lite": { input: 0.075 / 1_000_000, output: 0.3 / 1_000_000 },
  "gemini-1.5-pro": { input: 1.25 / 1_000_000, output: 5 / 1_000_000 },
  "gemini-1.5-flash": { input: 0.075 / 1_000_000, output: 0.3 / 1_000_000 },
};

export function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = PRICING[model];
  if (!pricing) return 0;
  return promptTokens * pricing.input + completionTokens * pricing.output;
}

export function getModelPricing(model: string): ModelPricing | null {
  return PRICING[model] ?? null;
}
