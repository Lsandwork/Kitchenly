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

export class AnthropicClient implements AIClient {
  id = "anthropic";

  available() {
    return hasValue(env().ANTHROPIC_API_KEY);
  }

  private model(task: AITask) {
    return env().AI_REASONING_MODEL || env().AI_FAST_MODEL || modelFor(task, env());
  }

  async completeStructured<T>(request: StructuredRequest<T>): Promise<T> {
    const raw = await this.completeText(request.task, [
      ...request.messages,
      {
        role: "user",
        content: `Return ONLY valid JSON for schema ${request.schemaName}. No markdown.`,
      },
    ]);
    return parseJson(request.schema, raw);
  }

  async completeText(task: AITask, messages: AIMessage[]) {
    if (!this.available()) throw new AIUnavailableError("ANTHROPIC_API_KEY is not set.");
    const system = messages.filter((message) => message.role === "system").map((message) => message.content).join("\n");
    const rest = messages.filter((message) => message.role !== "system");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env().ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model(task),
        max_tokens: 4096,
        system: system || undefined,
        messages: rest.map((message) => ({
          role: message.role === "assistant" ? "assistant" : "user",
          content: message.images?.length
            ? [
                { type: "text", text: message.content },
                ...message.images.map((image) => ({
                  type: "image",
                  source: { type: "base64", media_type: image.mimeType, data: image.base64 },
                })),
              ]
            : message.content,
        })),
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      logger.error("anthropic.failed", { status: response.status, body: body.slice(0, 400) });
      throw new Error(`Anthropic request failed (${response.status})`);
    }
    const json = (await response.json()) as { content?: { text?: string }[] };
    return json.content?.map((block) => block.text ?? "").join("") ?? "";
  }
}
