"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, SurfaceCard } from "@/components/ui";

type Step = { order: number; instruction: string; timerSeconds?: number | null; tip?: string };
type Session = {
  id: string;
  title: string;
  currentStep: number;
  servings: number;
  status: string;
  steps: Step[];
  recipeId?: string | null;
  recipeSlug?: string | null;
};

type DepletionItem = {
  canonicalId: string;
  name: string;
  quantityUsed?: number | null;
  unit?: string | null;
  checked: boolean;
};

export default function CookPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [timers, setTimers] = useState<{ id: string; label: string; seconds: number }[]>([]);
  const [rating, setRating] = useState<string | null>(null);
  const [phase, setPhase] = useState<"cook" | "rate" | "inventory">("cook");
  const [depletion, setDepletion] = useState<DepletionItem[]>([]);
  const [leftoverQty, setLeftoverQty] = useState("2");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/cook?id=${params.id}`)
      .then((res) => res.json())
      .then((data) => setSession(data.session))
      .catch(() => undefined);
  }, [params.id]);

  useEffect(() => {
    let wake: WakeLockSentinel | null = null;
    void navigator.wakeLock?.request("screen").then((lock) => {
      wake = lock;
    }).catch(() => undefined);
    return () => {
      void wake?.release();
    };
  }, []);

  useEffect(() => {
    if (!timers.length) return;
    const id = window.setInterval(() => {
      setTimers((rows) =>
        rows
          .map((row) => ({ ...row, seconds: Math.max(0, row.seconds - 1) }))
          .filter((row) => row.seconds > 0 || true),
      );
    }, 1000);
    return () => window.clearInterval(id);
  }, [timers.length]);

  async function act(action: string, extra?: Record<string, unknown>) {
    const res = await fetch("/api/cook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id: params.id, ...extra }),
    });
    const data = await res.json();
    if (data.session) {
      const fresh = await fetch(`/api/cook?id=${params.id}`);
      setSession((await fresh.json()).session);
    }
    if (data.answer) setAnswer(data.answer);
    if (action === "complete") setPhase("rate");
  }

  async function loadDepletionPreview() {
    if (!session?.recipeSlug) {
      setPhase("inventory");
      return;
    }
    const res = await fetch(`/api/recipes/${session.recipeSlug}?servings=${session.servings}`);
    if (!res.ok) {
      setPhase("inventory");
      return;
    }
    const data = await res.json();
    setDepletion(
      (data.recipe.ingredients || [])
        .filter((item: { quantity?: number | null; optional?: boolean }) => item.quantity != null && !item.optional)
        .map((item: { canonicalId: string; name: string; quantity?: number | null; unit?: string | null }) => ({
          canonicalId: item.canonicalId,
          name: item.name,
          quantityUsed: item.quantity,
          unit: item.unit,
          checked: true,
        })),
    );
    setPhase("inventory");
  }

  async function confirmInventory() {
    if (!session?.recipeSlug) {
      setMessage("Done — leftovers can be added from the recipe page.");
      return;
    }
    const res = await fetch(`/api/recipes/${session.recipeSlug}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "complete",
        servings: session.servings,
        depletion: depletion
          .filter((item) => item.checked)
          .map((item) => ({
            canonicalId: item.canonicalId,
            name: item.name,
            quantityUsed: item.quantityUsed,
            unit: item.unit,
          })),
        leftovers: {
          name: `${session.title} leftovers`,
          quantity: Number(leftoverQty) || 1,
          unit: "servings",
        },
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setMessage(data.error || "Could not update kitchen");
      return;
    }
    setMessage("Kitchen updated. Leftovers saved.");
  }

  if (!session) {
    return <main className="px-4 py-16 text-center text-[var(--kf-text-muted)]">Setting the stove...</main>;
  }

  const step = session.steps[session.currentStep];
  const last = session.currentStep >= session.steps.length - 1;

  if (phase === "rate" || (session.status === "done" && phase === "cook" && rating)) {
    return (
      <main className="mx-auto flex min-h-[80vh] max-w-xl flex-col justify-center px-4 text-center">
        <h1 className="display text-4xl">How was it?</h1>
        <p className="mt-3 text-lg text-[var(--kf-text-muted)]">Be honest — it helps me stop suggesting the wrong things.</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            ["loved", "Loved it"],
            ["good", "Pretty good"],
            ["okay", "It was okay"],
            ["nope", "Not for me"],
          ].map(([value, label]) => (
            <Button
              key={value}
              tone={value === "loved" ? "olive" : "secondary"}
              onClick={() => {
                setRating(value);
                void fetch("/api/feedback", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ rating: value, recipeId: session.recipeId }),
                });
                void loadDepletionPreview();
              }}
            >
              {label}
            </Button>
          ))}
        </div>
      </main>
    );
  }

  if (phase === "inventory") {
    return (
      <main className="mx-auto flex min-h-[80vh] max-w-xl flex-col justify-center gap-4 px-4 py-10">
        <h1 className="display text-4xl">Any leftovers?</h1>
        <p className="text-lg text-[var(--kf-text-muted)]">Confirm what left your Kitchen — nothing changes until you say so.</p>
        <SurfaceCard className="space-y-3 p-5 text-left">
          {depletion.map((item) => (
            <label key={item.canonicalId} className="flex items-center gap-3 font-semibold">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(event) =>
                  setDepletion((rows) =>
                    rows.map((row) => (row.canonicalId === item.canonicalId ? { ...row, checked: event.target.checked } : row)),
                  )
                }
              />
              Use {item.quantityUsed}
              {item.unit ? ` ${item.unit}` : ""} {item.name}
            </label>
          ))}
          <label className="block space-y-2 text-sm font-semibold">
            Leftover servings
            <input
              value={leftoverQty}
              onChange={(event) => setLeftoverQty(event.target.value)}
              className="min-h-12 w-full rounded-full border border-[var(--kf-border-strong)] px-4 font-normal"
            />
          </label>
        </SurfaceCard>
        {message ? <p className="text-[var(--kf-olive)]">{message}</p> : null}
        <Button tone="olive" onClick={() => void confirmInventory()}>
          Confirm Kitchen update
        </Button>
        <Link href="/recipes" className="text-center font-bold text-[var(--kf-olive)]">
          Back to Recipes
        </Link>
        <Link href="/tonight" className="text-center font-bold text-[var(--kf-text-muted)]">
          Tonight
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <button type="button" className="font-bold text-[var(--kf-text-muted)]" onClick={() => router.push("/recipes")}>
          Close
        </button>
        <p className="kf-eyebrow !tracking-[0.16em]">
          Step {session.currentStep + 1} of {session.steps.length}
        </p>
        <span />
      </div>
      <p className="mt-6 text-[var(--kf-text-muted)]">{session.title}</p>
      <h1 className="display mt-2 text-4xl leading-tight md:text-5xl">{step?.instruction}</h1>
      {step?.tip ? <p className="mt-4 text-xl text-[var(--kf-olive)]">{step.tip}</p> : null}

      {timers.length ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {timers.map((timer) => (
            <span key={timer.id} className="rounded-full bg-[var(--kf-espresso)] px-4 py-2 text-sm font-bold text-white">
              {timer.label}: {Math.floor(timer.seconds / 60)}:{String(timer.seconds % 60).padStart(2, "0")}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-auto space-y-3 pb-8 pt-10">
        {answer ? <SurfaceCard className="p-4 text-lg">{answer}</SurfaceCard> : null}
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (question.trim()) {
              void act("ask", { question });
              setQuestion("");
            }
          }}
        >
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="How do I know the chicken is done?"
            className="min-h-14 flex-1 rounded-full border border-[var(--kf-border-strong)] bg-[var(--kf-surface-elevated)] px-5 outline-none"
          />
          <Button type="submit" tone="secondary">
            Ask
          </Button>
        </form>
        {step?.timerSeconds ? (
          <Button
            tone="olive"
            className="w-full min-h-16 text-xl"
            onClick={() =>
              setTimers((rows) => [
                ...rows,
                {
                  id: `${Date.now()}`,
                  label: `Step ${session.currentStep + 1}`,
                  seconds: step.timerSeconds ?? 0,
                },
              ])
            }
          >
            Start {Math.round((step.timerSeconds ?? 0) / 60)}:00 timer
          </Button>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <Button tone="secondary" className="min-h-16 text-xl" onClick={() => void act("prev")}>
            Back
          </Button>
          <Button className="min-h-16 text-xl" tone="olive" onClick={() => void (last ? act("complete") : act("next"))}>
            {last ? "I'm done" : "Next"}
          </Button>
        </div>
      </div>
    </main>
  );
}
