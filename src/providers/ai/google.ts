import { env, hasValue } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  AIUnavailableError,
  modelFor,
  parseJson,
  type AIClient,
  type AIMessage,
  type AITask,
  type StructuredRequest,
} from "@/providers/ai/types";

export class GoogleAIClient implements AIClient {
  id = "google";

  available() {
    return hasValue(env().GOOGLE_AI_API_KEY);
  }

  private model(task: AITask) {
    return env().AI_VISION_MODEL || env().AI_REASONING_MODEL || modelFor(task, env());
  }

  async completeStructured<T>(request: StructuredRequest<T>): Promise<T> {
    const raw = await this.completeText(request.task, [
      ...request.messages,
      { role: "user", content: `Respond with JSON only matching ${request.schemaName}.` },
    ]);
    return parseJson(request.schema, raw);
  }

  async completeText(task: AITask, messages: AIMessage[]) {
    if (!this.available()) throw new AIUnavailableError("GOOGLE_AI_API_KEY is not set.");
    const model = this.model(task);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env().GOOGLE_AI_API_KEY}`;
    const contents = messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [
          { text: message.content },
          ...(message.images ?? []).map((image) => ({
            inline_data: { mime_type: image.mimeType, data: image.base64 },
          })),
        ],
      }));
    const system = messages.find((message) => message.role === "system")?.content;
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        system_instruction: system ? { parts: [{ text: system }] } : undefined,
        contents,
        generationConfig: { temperature: 0.4 },
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      logger.error("google_ai.failed", { status: response.status, body: body.slice(0, 400) });
      throw new Error(`Google AI request failed (${response.status})`);
    }
    const json = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  }
}
