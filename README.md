# Dishly

An AI kitchen companion that looks at what you actually have, decides what you should cook, substitutes when it should, shops only for the gap, and walks you through dinner.

This is not a chatbot wrapped around a recipe dump. The product loop is:

**See → Understand → Decide → Substitute → Shop → Cook → Remember**

## Run it

```bash
npm install
npm run setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

You can use the app immediately without API keys:

- Type what you have
- Get ranked recipes from the owned corpus (and TheMealDB when the network is available)
- See make-now vs almost-there vs original recipes
- Build a minimum shopping list
- Cook in a large-step, messy-hands mode

Add keys in `.env` to unlock more:

| Variable | What it enables |
| --- | --- |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GOOGLE_AI_API_KEY` | Fridge vision, conversational polish, original recipe generation |
| `AI_VISION_MODEL` / `AI_REASONING_MODEL` / `AI_FAST_MODEL` | Model routing — change models without rewriting the app |
| `SPOONACULAR_API_KEY` | Additional published recipe retrieval with source links |
| `INSTACART_API_KEY` | Missing-ingredient shopping list pages via current Instacart Developer Platform (`POST /idp/v1/products/products_link`) |
| `GOOGLE_MAPS_API_KEY` | Nearby grocery discovery via Places API (New) `places:searchNearby` |
| `DOORDASH_*` / `UBER_*` | Adapter present; unused until partner access exists. The UI will not pretend live inventory. |

Never put secrets in client code. They stay on the server.

## What is real vs generated

- **Existing recipes** from TheMealDB / Spoonacular keep their source name and URL. The app does not scrape copyrighted sites.
- **Dishly originals** live in `src/data/owned-recipes.ts` and are labeled as original.
- **AI-created recipes** are labeled “I made this one for your kitchen” and never presented as published.

Store hours, shelf inventory, prices, and ratings are never invented. If a grocery API is not configured, you get local Maps search and a clear “likely nearby” disclaimer.

## Architecture

```
UI
 ↓
Application services (kitchen, scan, recommend, conversation, cooking, shopping)
 ↓
Domain (normalization, matching, substitutions, personality, quality checks)
 ↓
Provider adapters (AI, recipes, Instacart, Places, DoorDash, Uber Eats, storage)
```

SQLite is the local database so the app runs on a laptop. The Prisma schema is relational and production-shaped; point `DATABASE_URL` at PostgreSQL for production.

## Tests

```bash
npm test
```

Covers ingredient aliases, spoken pantry parsing, substitutions, allergy hard-stops, minimum shopping, list merging, and provider honesty.
