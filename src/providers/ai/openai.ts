import OpenAI from "openai";
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

function toMessage(message: AIMessage): OpenAI.Chat.Completions.ChatCompletionMessageParam {
  return {
    role: message.role,
    content: toContent(message),
  } as OpenAI.Chat.Completions.ChatCompletionMessageParam;
}

function toContent(message: AIMessage): OpenAI.Chat.Completions.ChatCompletionContentPart[] | string {
  if (!message.images?.length) return message.content;
  return [
    { type: "text", text: message.content },
    ...message.images.map((image) => ({
      type: "image_url" as const,
      image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
    })),
  ];
}

export class OpenAIClient implements AIClient {
  id = "openai";
  private client: OpenAI | null = null;

  available() {
    return hasValue(env().OPENAI_API_KEY);
  }

  private api() {
    if (!this.available()) throw new AIUnavailableError("OPENAI_API_KEY is not set.");
    if (!this.client) this.client = new OpenAI({ apiKey: env().OPENAI_API_KEY });
    return this.client;
  }

  private model(task: AITask) {
    return modelFor(task, env());
  }

  async completeStructured<T>(request: StructuredRequest<T>): Promise<T> {
    const messages = request.messages.map((message) => toMessage(message));
    const mentionsJson = messages.some((message) => {
      const content = typeof message.content === "string" ? message.content : JSON.stringify(message.content);
      return /json/i.test(content);
    });
    if (!mentionsJson) {
      messages.push({
        role: "user",
        content: `Respond with a single JSON object for ${request.schemaName}.`,
      });
    }
    const completion = await this.api().chat.completions.create({
      model: this.model(request.task),
      temperature: request.temperature ?? 0.3,
      response_format: { type: "json_object" },
      messages,
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    try {
      return await parseJson(request.schema, raw);
    } catch (error) {
      logger.warn("openai.structured_parse_retry", { error: String(error) });
      return request.schema.parse(JSON.parse(raw));
    }
  }

  async completeText(task: AITask, messages: AIMessage[]) {
    const completion = await this.api().chat.completions.create({
      model: this.model(task),
      temperature: 0.6,
      messages: messages.map((message) => toMessage(message)),
    });
    return completion.choices[0]?.message?.content?.trim() ?? "";
  }
}