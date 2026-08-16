import { env } from "@/lib/env";
import { AnthropicClient } from "@/providers/ai/anthropic";
import { GoogleAIClient } from "@/providers/ai/google";
import { OpenAIClient } from "@/providers/ai/openai";
import { AIUnavailableError, type AIClient, type AITask } from "@/providers/ai/types";

const clients: AIClient[] = [new OpenAIClient(), new AnthropicClient(), new GoogleAIClient()];

export function configuredAI(): AIClient | null {
  const preferred = env().AI_PROVIDER?.toLowerCase();
  if (preferred) {
    const match = clients.find((client) => client.id === preferred && client.available());
    if (match) return match;
  }
  return clients.find((client) => client.available()) ?? null;
}

export function requireAI(): AIClient {
  const client = configuredAI();
  if (!client) throw new AIUnavailableError();
  return client;
}

export function aiStatus() {
  return {
    available: Boolean(configuredAI()),
    provider: configuredAI()?.id ?? null,
    vision: env().AI_VISION_MODEL || null,
    reasoning: env().AI_REASONING_MODEL || null,
    fast: env().AI_FAST_MODEL || null,
  };
}

export async function withAIFallback<T>(
  task: AITask,
  run: (client: AIClient) => Promise<T>,
): Promise<T> {
  const primary = configuredAI();
  if (!primary) throw new AIUnavailableError();
  try {
    return await run(primary);
  } catch (error) {
    const fallback = clients.find((client) => client.id !== primary.id && client.available());
    if (!fallback) throw error;
    return run(fallback);
  }
}

export { AIUnavailableError };
export type { AITask };
