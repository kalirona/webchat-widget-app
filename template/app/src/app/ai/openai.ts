import OpenAI from "openai";
import type { AIProvider, GenerateOptions, GenerateResult } from "./provider";

export function createOpenAIProvider(apiKey: string): AIProvider {
  const client = new OpenAI({ apiKey });

  return {
    async generate(options: GenerateOptions): Promise<GenerateResult> {
      const { messages, systemPrompt, model, temperature, maxTokens, onChunk } = options;

      const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
      if (systemPrompt) {
        apiMessages.push({ role: "system", content: systemPrompt });
      }
      for (const m of messages) {
        if (m.role === "system") continue;
        apiMessages.push({ role: m.role as "user" | "assistant", content: m.content });
      }

      let fullContent = "";
      let promptTokens = 0;
      let completionTokens = 0;

      if (onChunk) {
        const stream = await client.chat.completions.create({
          model,
          messages: apiMessages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
          stream_options: { include_usage: true },
        });

        for await (const chunk of stream) {
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            await onChunk(delta);
          }
          if (chunk.usage) {
            promptTokens = chunk.usage.prompt_tokens ?? promptTokens;
            completionTokens = chunk.usage.completion_tokens ?? completionTokens;
          }
        }
      } else {
        const response = await client.chat.completions.create({
          model,
          messages: apiMessages,
          temperature,
          max_tokens: maxTokens,
        });

        fullContent = response.choices?.[0]?.message?.content ?? "";
        promptTokens = response.usage?.prompt_tokens ?? 0;
        completionTokens = response.usage?.completion_tokens ?? 0;
      }

      return { content: fullContent, promptTokens, completionTokens, model };
    },
  };
}
