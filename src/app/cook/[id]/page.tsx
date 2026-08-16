"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";

type Step = { order: number; instruction: string; timerSeconds?: number | null; tip?: string };
type Session = {
  id: string;
  title: string;
  currentStep: number;
  servings: number;
  status: string;
  steps: Step[];
};

export default function CookPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [rating, setRating] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/cook?id=${params.id}`)
      .then((res) => res.json())
      .then((data) => setSession(data.session))
      .catch(() => undefined);
  }, [params.id]);

  useEffect(() => {
    if (secondsLeft == null) return;
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((value) => (value ?? 1) - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

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
  }

  if (!session) {
    return <main className="px-4 py-16 text-center">Setting the stove...</main>;
  }

  const step = session.steps[session.currentStep];
  const last = session.currentStep >= session.steps.length - 1;

  if (session.status === "done" || rating) {
    return (
      <main className="mx-auto flex min-h-[80vh] max-w-xl flex-col justify-center px-4 text-center">
        <h1 className="display text-4xl">How was it?</h1>
        <p className="mt-3 text-lg text-ink-soft">Be honest — it helps me stop suggesting the wrong things.</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            ["loved", "Loved it"],
            ["good", "Pretty good"],
            ["okay", "It was okay"],
            ["nope", "Not for me"],
          ].map(([value, label]) => (
            <Button key={value} tone={value === "loved" ? "primary" : "secondary"} onClick={() => {
              setRating(value);
              void fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rating: value }),
              });
            }}>
              {label}
            </Button>
          ))}
        </div>
        <Link href="/" className="mt-8 font-bold text-olive">
          Back to tonight
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <button type="button" className="font-bold text-ink-soft" onClick={() => router.push("/")}>
          Close
        </button>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-terracotta">
          Step {session.currentStep + 1} of {session.steps.length}
        </p>
        <span />
      </div>
      <p className="mt-6 text-ink-soft">{session.title}</p>
      <h1 className="display mt-2 text-4xl leading-tight md:text-5xl">{step?.instruction}</h1>
      {step?.tip ? <p className="mt-4 text-xl text-olive">{step.tip}</p> : null}

      <div className="mt-auto space-y-3 pb-8 pt-10">
        {answer ? <p className="paper-card rounded-3xl p-4 text-lg">{answer}</p> : null}
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
            className="min-h-14 flex-1 rounded-full border border-[var(--line)] bg-cream px-5"
          />
          <Button type="submit" tone="secondary">
            Ask
          </Button>
        </form>
        {step?.timerSeconds ? (
          <Button
            tone="olive"
            className="w-full min-h-16 text-xl"
            onClick={() => setSecondsLeft(step.timerSeconds ?? 0)}
          >
            {secondsLeft != null ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}` : `Start ${Math.round((step.timerSeconds ?? 0) / 60)}:00 timer`}
          </Button>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <Button tone="secondary" className="min-h-16 text-xl" onClick={() => void act("prev")}>
            Back
          </Button>
          <Button
            className="min-h-16 text-xl"
            onClick={() => void (last ? act("complete") : act("next"))}
          >
            {last ? "I'm done" : "Next"}
          </Button>
        </div>
      </div>
    </main>
  );
}
