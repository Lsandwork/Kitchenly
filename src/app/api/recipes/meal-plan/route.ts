import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, json } from "@/lib/http";
import { weeklyShopping } from "@/services/recipes";
import { sendRecipeEmail } from "@/services/email";
import { dbRecipeToRecord } from "@/services/recipes/mapper";

export async function GET() {
  const user = await requireUser();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const entries = await db.mealPlanEntry.findMany({
    where: { userId: user.id, date: { gte: start, lt: end } },
    include: { recipe: true },
    orderBy: [{ date: "asc" }, { mealType: "asc" }],
  });
  const shopping = await weeklyShopping(user.id);
  return json({ entries, shopping: shopping.shopping });
}

const Body = z.object({
  action: z.enum(["add", "remove", "email_week"]),
  id: z.string().optional(),
  recipeId: z.string().optional(),
  title: z.string().optional(),
  date: z.string().optional(),
  mealType: z.string().optional(),
  servings: z.number().optional(),
  emails: z.array(z.string().email()).optional(),
});

export async function POST(request: Request) {
  const user = await requireUser();
  try {
    const body = Body.parse(await request.json());
    if (body.action === "add") {
      const entry = await db.mealPlanEntry.create({
        data: {
          userId: user.id,
          recipeId: body.recipeId,
          title: body.title || "Planned meal",
          date: body.date ? new Date(body.date) : new Date(),
          mealType: body.mealType || "dinner",
          servings: body.servings || 2,
        },
      });
      return json({ entry });
    }
    if (body.action === "remove" && body.id) {
      await db.mealPlanEntry.deleteMany({ where: { id: body.id, userId: user.id } });
      return json({ ok: true });
    }
    if (body.action === "email_week") {
      const shopping = await weeklyShopping(user.id);
      const emails = body.emails?.length ? body.emails : user.email ? [user.email] : [];
      if (!emails.length) return fail("Add an email address.", 400);
      const lines = shopping.entries
        .map((entry) => {
          const day = entry.date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
          return `<li><strong>${day}</strong> — ${entry.mealType}: ${entry.title}</li>`;
        })
        .join("");
      const firstRecipe = shopping.entries.find((entry) => entry.recipe)?.recipe;
      const recipe = firstRecipe
        ? dbRecipeToRecord(firstRecipe)
        : {
            id: "weekly",
            slug: "easy-dinners",
            title: "Your week of dinners",
            description: "Weekly meal plan from Kitchen Friend",
            origin: "owned" as const,
            servings: 2,
            difficulty: "easy" as const,
            diets: [],
            allergens: [],
            equipment: [],
            ingredients: [],
            steps: [],
            tags: [],
          };
      const result = await sendRecipeEmail(user.id, {
        to: emails,
        recipe,
        shopping: shopping.shopping,
        kind: "weekly_plan",
        subject: "Your Kitchen Friend week",
        includeInstructions: false,
        includeIngredients: false,
        extraHtml: `<h2 style="font-size:20px;margin:18px 0 8px;">This week's plan</h2><ul>${lines}</ul>`,
      });
      return json(result);
    }
    return fail("Unknown action", 400);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Meal plan failed", 400);
  }
}
