type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

type StreamChunk = {
  content: string;
  done: boolean;
};

type GenerateOptions = {
  messages: Message[];
  systemPrompt?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  onChunk?: (chunk: string) => void | Promise<void>;
};

type GenerateResult = {
  content: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
};

interface AIProvider {
  generate(options: GenerateOptions): Promise<GenerateResult>;
}

export type { Message, StreamChunk, GenerateOptions, GenerateResult, AIProvider };
