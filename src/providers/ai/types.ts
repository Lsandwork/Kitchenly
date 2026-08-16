import { z } from "zod";

export type AITask = "vision" | "reasoning" | "fast" | "embedding";

export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  images?: { mimeType: string; base64: string }[];
};

export type StructuredRequest<T> = {
  task: AITask;
  schema: z.ZodType<T>;
  schemaName: string;
  messages: AIMessage[];
  temperature?: number;
};

export type StreamChunk =
  | { type: "text"; text: string }
  | { type: "status"; text: string };

export interface AIClient {
  id: string;
  available(): boolean;
  completeStructured<T>(request: StructuredRequest<T>): Promise<T>;
  completeText(task: AITask, messages: AIMessage[]): Promise<string>;
}

export class AIUnavailableError extends Error {
  constructor(message = "No AI provider is configured.") {
    super(message);
    this.name = "AIUnavailableError";
  }
}

export function modelFor(task: AITask, env: Record<string, string | undefined>) {
  if (task === "vision") return env.AI_VISION_MODEL || env.AI_REASONING_MODEL || "gpt-5.6-terra";
  if (task === "fast") return env.AI_FAST_MODEL || "gpt-5.6-luna";
  if (task === "embedding") return env.AI_EMBEDDING_MODEL || "text-embedding-3-large";
  return env.AI_REASONING_MODEL || env.AI_VISION_MODEL || "gpt-5.6-terra";
}

export function jsonSchemaOf(schemaName: string) {
  return {
    name: schemaName,
    strict: false,
  };
}

export async function parseJson<T>(schema: z.ZodType<T>, raw: string): Promise<T> {
  const trimmed = raw.trim().replace(/^```json\s*/i, "").replace(/```$/i, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  const json = start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
  return schema.parse(JSON.parse(json));
}
