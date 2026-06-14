import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIProvider, GenerateOptions, GenerateResult } from "./provider";

export function createGeminiProvider(apiKey: string): AIProvider {
  const genAI = new GoogleGenerativeAI(apiKey);

  return {
    async generate(options: GenerateOptions): Promise<GenerateResult> {
      const { messages, systemPrompt, model, temperature, maxTokens, onChunk } = options;

      const model_ = genAI.getGenerativeModel({
        model,
        systemInstruction: systemPrompt,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      });

      const history: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
      for (const m of messages) {
        if (m.role === "system") continue;
        history.push({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        });
      }

      let fullContent = "";
      let promptTokens = 0;
      let completionTokens = 0;

      if (onChunk) {
        const chat = model_.startChat({ history: history.slice(0, -1) });
        const lastMsg = history[history.length - 1];
        const result = await chat.sendMessageStream(lastMsg.parts[0].text);

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            fullContent += text;
            await onChunk(text);
          }
        }

        const response = await result.response;
        if (response.usageMetadata) {
          promptTokens = response.usageMetadata.promptTokenCount ?? 0;
          completionTokens = response.usageMetadata.candidatesTokenCount ?? 0;
        }
      } else {
        const chat = model_.startChat({ history: history.slice(0, -1) });
        const lastMsg = history[history.length - 1];
        const result = await chat.sendMessage(lastMsg.parts[0].text);
        const response = result.response;
        fullContent = response.text();

        if (response.usageMetadata) {
          promptTokens = response.usageMetadata.promptTokenCount ?? 0;
          completionTokens = response.usageMetadata.candidatesTokenCount ?? 0;
        }
      }

      return { content: fullContent, promptTokens, completionTokens, model };
    },
  };
}
