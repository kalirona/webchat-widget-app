import { prisma } from "wasp/server";
import { createOpenAIProvider } from "./openai";
import { createGeminiProvider } from "./gemini";
import { retrieveRelevantChunks, buildKnowledgeContext } from "./rag";
import { calculateCost } from "./cost";
import { decryptSecret } from "../../shared/crypto";
import { getAllowedModels, shouldWarnUsage } from "../billing/constants";
import { sendLimitWarningEmail } from "../billing/emails";
import type { AIProvider, GenerateResult } from "./provider";

class AiError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
    public readonly code: string,
  ) {
    super(message);
    this.name = "AiError";
  }
}

function classifyError(error: unknown): AiError {
  if (error instanceof AiError) return error;

  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  if (lower.includes("rate limit") || lower.includes("429") || lower.includes("too many requests")) {
    return new AiError("Rate limited. Retrying...", true, "RATE_LIMITED");
  }
  if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("econnrefused") || lower.includes("5")) {
    return new AiError("Service temporarily unavailable. Retrying...", true, "SERVICE_UNAVAILABLE");
  }
  if (lower.includes("auth") || lower.includes("api key") || lower.includes("unauthorized") || lower.includes("401") || lower.includes("403")) {
    return new AiError("Invalid API key. Check your AI provider settings.", false, "AUTH_ERROR");
  }
  if (lower.includes("insufficient_quota") || lower.includes("quota") || lower.includes("billing")) {
    return new AiError("API quota exceeded. Check your billing.", false, "QUOTA_EXCEEDED");
  }
  if (lower.includes("context_length") || lower.includes("max tokens") || lower.includes("too many tokens")) {
    return new AiError("Message too long. Try a shorter message.", true, "CONTEXT_TOO_LONG");
  }
  if (lower.includes("model not found") || lower.includes("not found") || lower.includes("404")) {
    return new AiError("AI model not available. Check your configuration.", false, "MODEL_NOT_FOUND");
  }

  return new AiError(`AI generation failed: ${msg}`, true, "UNKNOWN");
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: AiError = new AiError("Unknown error", false, "UNKNOWN");

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = classifyError(error);

      if (!lastError.retryable || attempt >= maxRetries) {
        throw lastError;
      }

      const jitter = Math.random() * 200;
      const delay = baseDelay * Math.pow(2, attempt) + jitter;
      console.warn(`AI retry ${attempt + 1}/${maxRetries}: ${lastError.message} (waiting ${Math.round(delay)}ms)`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError;
}

export async function generateAiResponse(
  conversationId: string,
  messageContent: string,
): Promise<{ messageId: string; content: string; tokens: number; cost: number; model: string }> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      agent: true,
      website: { include: { organization: true } },
    },
  });
  if (!conversation) throw new Error("Conversation not found");

  // Load only the last 20 completed messages (not all messages)
  const recentMessagesRaw = await prisma.message.findMany({
    where: { conversationId, status: "completed" },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { role: true, content: true },
  });
  const recentMessages = recentMessagesRaw.reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const org = conversation.website?.organization ?? (await prisma.organization.findUnique({
    where: { id: conversation.organizationId },
  }));
  if (!org) throw new Error("Organization not found");

  const provider = conversation.agent?.providerOverride ?? org.aiProvider;
  const model = conversation.agent?.modelOverride ?? org.aiModel;
  const temperature = conversation.agent?.temperature ?? 0.7;
  const maxTokens = conversation.agent?.maxTokens ?? 4096;
  const systemPrompt = conversation.agent?.systemPrompt ?? "You are a helpful AI assistant.";

  const aiModel = getAiProvider(provider, org);
  if (!aiModel) throw new Error(`AI provider "${provider}" not configured. Add API key in Settings.`);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const tokenLimit = org.monthlyTokenLimit ?? 100000;
  const usage = await prisma.aiUsage.aggregate({
    where: { organizationId: org.id, date: { gte: monthStart } },
    _sum: { promptTokens: true, completionTokens: true },
  });
  const totalTokens = (usage._sum.promptTokens ?? 0) + (usage._sum.completionTokens ?? 0);
  if (totalTokens >= tokenLimit) {
    throw new AiError(
      `Monthly token limit reached (${tokenLimit.toLocaleString()}). Upgrade your plan for more tokens.`,
      false,
      "TOKEN_LIMIT_EXCEEDED",
    );
  }

  // Send warning email at 80% usage (non-blocking)
  if (shouldWarnUsage(totalTokens, tokenLimit)) {
    sendLimitWarningEmail(org.id, "tokens", totalTokens, tokenLimit).catch(() => {});
  }

  // Check model restrictions
  const allowedModels = getAllowedModels(org.subscriptionPlan);
  if (allowedModels && !allowedModels.includes(model)) {
    throw new AiError(
      `Model "${model}" is not available on your plan. Allowed models: ${allowedModels.join(", ")}.`,
      false,
      "MODEL_NOT_ALLOWED",
    );
  }

  let knowledgeContext = "";
  if (conversation.agent) {
    const chunks = await retrieveRelevantChunks(conversation.agent.id, messageContent);
    if (chunks.length > 0) {
      knowledgeContext = buildKnowledgeContext(chunks);
    }
  }

  const effectiveSystemPrompt = systemPrompt + knowledgeContext;

  const streamingMessage = await prisma.message.create({
    data: {
      content: "",
      role: "assistant",
      source: "widget",
      status: "streaming",
      model,
      conversationId,
    },
  });

  const chunks: string[] = [];
  let lastFlushTime = 0;
  let pendingFlush: ReturnType<typeof setTimeout> | null = null;

  const flushChunks = async () => {
    lastFlushTime = Date.now();
    await prisma.message.update({
      where: { id: streamingMessage.id },
      data: { content: chunks.join("") },
    });
  };

  try {
    const result = await withRetry(async () => {
      return await aiModel.generate({
        messages: recentMessages,
        systemPrompt: effectiveSystemPrompt,
        model,
        temperature,
        maxTokens,
        onChunk: async (chunk) => {
          chunks.push(chunk);
          const now = Date.now();
          // Flush immediately if 500ms since last flush, otherwise debounce
          if (now - lastFlushTime >= 500) {
            if (pendingFlush) { clearTimeout(pendingFlush); pendingFlush = null; }
            await flushChunks();
          } else if (!pendingFlush) {
            pendingFlush = setTimeout(async () => {
              pendingFlush = null;
              await flushChunks();
            }, 500);
          }
        },
      });
    });

    const fullContent = chunks.join("");
    // Ensure any pending debounced chunks are flushed
    if (pendingFlush) { clearTimeout(pendingFlush); pendingFlush = null; }
    if (chunks.length > 0 && Date.now() - lastFlushTime >= 100) {
      await flushChunks();
    }
    const cost = calculateCost(result.model, result.promptTokens, result.completionTokens);
    const totalTokens = result.promptTokens + result.completionTokens;

    await prisma.message.update({
      where: { id: streamingMessage.id },
      data: {
        content: fullContent,
        status: "completed",
        tokens: totalTokens,
        cost,
        model: result.model,
      },
    });

    await trackUsage(org.id, result.model, result.promptTokens, result.completionTokens, cost);

    return {
      messageId: streamingMessage.id,
      content: fullContent,
      tokens: totalTokens,
      cost,
      model: result.model,
    };
  } catch (error) {
    const partialContent = chunks.join("");
    const aiError = classifyError(error);

    await prisma.message.update({
      where: { id: streamingMessage.id },
      data: {
        content: partialContent || "I'm sorry, I encountered an error processing your request. Please try again.",
        status: "error",
        tokens: 0,
        cost: 0,
        model,
      },
    });

    throw new Error(aiError.message);
  }
}

function getAiProvider(provider: string, org: { openaiApiKey?: string | null; geminiApiKey?: string | null }): AIProvider | null {
  if (provider === "openai") {
    if (!org.openaiApiKey) return null;
    return createOpenAIProvider(decryptSecret(org.openaiApiKey));
  }
  if (provider === "gemini") {
    if (!org.geminiApiKey) return null;
    return createGeminiProvider(decryptSecret(org.geminiApiKey));
  }
  return null;
}

async function trackUsage(
  organizationId: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
  cost: number,
): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.aiUsage.findFirst({
    where: {
      organizationId,
      date: today,
      model,
    },
  });

  if (existing) {
    await prisma.aiUsage.update({
      where: { id: existing.id },
      data: {
        promptTokens: { increment: promptTokens },
        completionTokens: { increment: completionTokens },
        cost: { increment: cost },
      },
    });
  } else {
    await prisma.aiUsage.create({
      data: {
        organizationId,
        model,
        date: today,
        promptTokens,
        completionTokens,
        cost,
      },
    });
  }
}
