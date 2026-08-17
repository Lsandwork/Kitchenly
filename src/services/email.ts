import { appUrl, env, hasValue } from "@/lib/env";
import { db } from "@/lib/db";
import { formatIngredient } from "@/domain/recipes/scale";
import type { RecipeIngredient, RecipeRecord, RecipeStep } from "@/domain/types";
import type { ShoppingItem } from "@/domain/shopping/lists";

export type RecipeEmailPayload = {
  to: string[];
  recipe: RecipeRecord;
  shopping?: ShoppingItem[];
  missing?: { name: string }[];
  includeRecipe?: boolean;
  includeIngredients?: boolean;
  includeInstructions?: boolean;
  includeShopping?: boolean;
  includeMissing?: boolean;
  notes?: string;
  kind?: "recipe" | "recipe_shopping" | "weekly_plan";
  subject?: string;
  extraHtml?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function shoppingLines(items: ShoppingItem[]) {
  return items
    .map((item) => {
      const qty = item.quantity != null ? `${item.quantity}${item.unit ? ` ${item.unit}` : ""} ` : "";
      return `□ ${qty}${item.name}`;
    })
    .join("\n");
}

export function buildRecipeEmailHtml(payload: RecipeEmailPayload) {
  const recipe = payload.recipe;
  const app = appUrl();
  const url = `${app}/recipes/${recipe.slug}`;
  const parts: string[] = [];
  parts.push(`<div style="font-family:Georgia,serif;background:#f7f3eb;padding:24px;color:#2a1a12;">`);
  parts.push(`<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:28px;padding:28px;border:1px solid rgba(42,26,18,.08);">`);
  parts.push(`<p style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#c05621;font-weight:700;">Dishly</p>`);
  parts.push(`<h1 style="font-size:32px;line-height:1.1;margin:8px 0 12px;">${escapeHtml(recipe.title)}</h1>`);
  parts.push(
    `<p style="color:#6b574c;margin:0 0 18px;">${recipe.totalMinutes ?? "—"} min · ${escapeHtml(recipe.difficulty)} · Serves ${recipe.servings}</p>`,
  );
  if (recipe.imageUrl) {
    parts.push(`<img src="${escapeHtml(recipe.imageUrl)}" alt="" style="width:100%;border-radius:20px;margin-bottom:18px;" />`);
  }
  if (payload.includeMissing !== false && payload.missing?.length) {
    parts.push(`<h2 style="font-size:20px;margin:18px 0 8px;">You're missing</h2><ul>`);
    for (const item of payload.missing) parts.push(`<li>${escapeHtml(item.name)}</li>`);
    parts.push(`</ul>`);
  }
  if (payload.includeShopping !== false && payload.shopping?.length) {
    parts.push(`<h2 style="font-size:20px;margin:18px 0 8px;">Shopping list</h2><pre style="white-space:pre-wrap;font-family:ui-sans-serif,system-ui;background:#f7f3eb;padding:14px;border-radius:16px;">${escapeHtml(shoppingLines(payload.shopping))}</pre>`);
  }
  if (payload.includeIngredients !== false) {
    parts.push(`<h2 style="font-size:20px;margin:18px 0 8px;">Ingredients</h2><ul>`);
    for (const item of recipe.ingredients) {
      parts.push(`<li>${escapeHtml(formatIngredient(item as RecipeIngredient))}</li>`);
    }
    parts.push(`</ul>`);
  }
  if (payload.includeInstructions !== false) {
    parts.push(`<h2 style="font-size:20px;margin:18px 0 8px;">Instructions</h2><ol>`);
    for (const step of recipe.steps as RecipeStep[]) {
      parts.push(`<li style="margin-bottom:8px;">${escapeHtml(step.instruction)}</li>`);
    }
    parts.push(`</ol>`);
  }
  if (payload.notes) {
    parts.push(`<h2 style="font-size:20px;margin:18px 0 8px;">Notes</h2><p>${escapeHtml(payload.notes)}</p>`);
  }
  if (payload.extraHtml) parts.push(payload.extraHtml);
  parts.push(`<p style="margin-top:24px;"><a href="${url}" style="display:inline-block;background:#4a5d3f;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700;">Open in Dishly</a></p>`);
  parts.push(`</div></div>`);
  return parts.join("");
}

export function buildRecipeEmailText(payload: RecipeEmailPayload) {
  const recipe = payload.recipe;
  const lines = [
    `Dishly`,
    recipe.title,
    `${recipe.totalMinutes ?? "—"} min · ${recipe.difficulty} · Serves ${recipe.servings}`,
    "",
  ];
  if (payload.missing?.length) {
    lines.push("You're missing:", ...payload.missing.map((item) => `• ${item.name}`), "");
  }
  if (payload.shopping?.length) {
    lines.push("Shopping list:", shoppingLines(payload.shopping), "");
  }
  if (payload.includeIngredients !== false) {
    lines.push("Ingredients:", ...recipe.ingredients.map((item) => `• ${formatIngredient(item)}`), "");
  }
  if (payload.includeInstructions !== false) {
    lines.push("Instructions:");
    recipe.steps.forEach((step, index) => lines.push(`${index + 1}. ${step.instruction}`));
    lines.push("");
  }
  lines.push(`Open: ${appUrl()}/recipes/${recipe.slug}`);
  return lines.join("\n");
}

export async function sendRecipeEmail(userId: string | null, payload: RecipeEmailPayload) {
  const subject = payload.subject || `Tonight's dinner: ${payload.recipe.title}`;
  const html = buildRecipeEmailHtml(payload);
  const text = buildRecipeEmailText(payload);
  const to = payload.to.map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (!to.length) throw new Error("Add at least one email address.");

  const apiKey = env().RESEND_API_KEY;
  const from = env().EMAIL_FROM || "Dishly <onboarding@resend.dev>";

  if (!hasValue(apiKey)) {
    const log = await db.emailSendLog.create({
      data: {
        userId: userId ?? undefined,
        toEmail: to.join(","),
        kind: payload.kind || "recipe",
        subject,
        payloadJson: JSON.stringify({ text, html, mode: "mailto_fallback" }),
        status: "mailto_fallback",
      },
    });
    return {
      ok: true as const,
      sent: false as const,
      mode: "mailto" as const,
      logId: log.id,
      mailto: `mailto:${encodeURIComponent(to.join(","))}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`,
      text,
      subject,
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text,
    }),
  });
  const data = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!response.ok) {
    await db.emailSendLog.create({
      data: {
        userId: userId ?? undefined,
        toEmail: to.join(","),
        kind: payload.kind || "recipe",
        subject,
        payloadJson: JSON.stringify({ error: data }),
        status: "failed",
      },
    });
    throw new Error(data.message || "Email failed to send.");
  }

  const log = await db.emailSendLog.create({
    data: {
      userId: userId ?? undefined,
      toEmail: to.join(","),
      kind: payload.kind || "recipe",
      subject,
      payloadJson: JSON.stringify({ providerId: data.id }),
      status: "sent",
      providerId: data.id,
    },
  });

  return { ok: true as const, sent: true as const, mode: "resend" as const, logId: log.id, providerId: data.id, subject };
}
