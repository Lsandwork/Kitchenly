import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.string().optional(),
  APP_URL: z.string().optional(),
  AUTH_SECRET: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  SCAN_RETENTION_DAYS: z.string().optional(),
  AI_PROVIDER: z.string().optional(),
  AI_VISION_MODEL: z.string().optional(),
  AI_REASONING_MODEL: z.string().optional(),
  AI_FAST_MODEL: z.string().optional(),
  AI_EMBEDDING_MODEL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  THEMEALDB_API_KEY: z.string().optional(),
  SPOONACULAR_API_KEY: z.string().optional(),
  INSTACART_API_KEY: z.string().optional(),
  INSTACART_API_BASE: z.string().optional(),
  DOORDASH_API_KEY: z.string().optional(),
  DOORDASH_CLIENT_ID: z.string().optional(),
  DOORDASH_CLIENT_SECRET: z.string().optional(),
  DOORDASH_API_BASE: z.string().optional(),
  UBER_CLIENT_ID: z.string().optional(),
  UBER_CLIENT_SECRET: z.string().optional(),
  UBER_API_BASE: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_REGION: z.string().optional(),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),
  STORAGE_ENDPOINT: z.string().optional(),
  STORAGE_PUBLIC_URL: z.string().optional(),
});

export type AppEnv = z.infer<typeof EnvSchema>;

let cached: AppEnv | null = null;

export function env(): AppEnv {
  if (cached) return cached;
  cached = EnvSchema.parse(process.env);
  return cached;
}

export function hasValue(value?: string | null): value is string {
  return Boolean(value && value.trim().length > 0);
}

export function appUrl() {
  return env().APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

export function scanRetentionDays() {
  const raw = env().SCAN_RETENTION_DAYS;
  const parsed = raw ? Number(raw) : 7;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
}
