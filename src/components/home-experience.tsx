"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink, Chip } from "@/components/ui";
import { RecipeCard, type ClientRecipe } from "@/components/recipe-card";

type KitchenItem = {
  id: string;
  name: string;
  canonicalId: string;
  location: string;
  confidence: number;
  confirmed: boolean;
  useSoon: boolean;
  isLeftover: boolean;
};

type MeResponse = {
  user: { guest: boolean; name: string | null };
  kitchen: KitchenItem[];
};

export function HomeExperience() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [speech, setSpeech] = useState("Show me what you've got. I'll figure out dinner.");
  const [pick, setPick] = useState<ClientRecipe | null>(null);
  const [alts, setAlts] = useState<ClientRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.json())
      .then((data) => {
        setMe(data);
        if (data.kitchen?.length) void loadDinner();
      })
      .catch(() => undefined);
  }, []);

  async function loadDinner(body: Record<string, unknown> = {}) {
    setLoading(true);
    setSpeech("Give me a second — I'm looking at what you've got.");
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setSpeech(data.speech);
      setPick(data.pick);
      setAlts(data.alternatives ?? []);
      if (data.pick) sessionStorage.setItem("kf:pick", JSON.stringify(data.pick));
    } finally {
      setLoading(false);
    }
  }

  async function startCook(recipe: ClientRecipe) {
    sessionStorage.setItem("kf:pick", JSON.stringify(recipe));
    const res = await fetch("/api/cook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", recipe }),
    });
    const data = await res.json();
    router.push(`/cook/${data.session.id}`);
  }

  async function chat(message: string) {
    setLoading(true);
    setSpeech("On it.");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      setSpeech(data.speech);
      setPick(data.pick);
      setAlts(data.alternatives ?? []);
      if (data.pick) sessionStorage.setItem("kf:pick", JSON.stringify(data.pick));
    } finally {
      setLoading(false);
    }
  }

  const urgent = useMemo(() => me?.kitchen.find((item) => item.useSoon) ?? me?.kitchen[0], [me]);
  const hasKitchen = Boolean(me?.kitchen?.length);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8 md:pt-14">
      {!hasKitchen ? (
        <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_.9fr]">
          <div className="space-y-6">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-terracotta">Your kitchen friend</p>
            <h1 className="display max-w-xl text-5xl font-semibold leading-[1.02] md:text-7xl">What&apos;s in your kitchen?</h1>
            <p className="max-w-lg text-xl text-ink-soft">Show me what you&apos;ve got. I&apos;ll figure out dinner.</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/scan" className="min-h-14 px-7 text-lg">
                Scan my fridge
              </ButtonLink>
              <ButtonLink href="/kitchen?mode=type" tone="secondary" className="min-h-14 px-7 text-lg">
                Tell me what I have
              </ButtonLink>
            </div>
            <button
              type="button"
              className="text-left text-lg font-semibold text-olive underline-offset-4 hover:underline"
              onClick={() => chat("What should I make tonight?")}
            >
              What should I make?
            </button>
          </div>
          <FridgeArt />
        </section>
      ) : (
        <section className="space-y-8">
          <div className="space-y-3">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-terracotta">Tonight</p>
            <h1 className="display text-4xl font-semibold md:text-6xl">I&apos;ve got a few ideas for you.</h1>
            <p className="max-w-2xl text-xl text-ink-soft">
              You&apos;ve got {me!.kitchen.slice(0, 4).map((item) => item.name).join(", ")}
              {me!.kitchen.length > 4 ? ", and a few other things" : ""} looking at you.
            </p>
          </div>
          {urgent ? (
            <div className="paper-card rounded-[24px] p-5">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-terracotta">Use this first</p>
              <p className="display mt-1 text-3xl">{urgent.name}</p>
              <p className="text-ink-soft">Let&apos;s rescue this before it gets sad.</p>
            </div>
          ) : null}
        </section>
      )}

      <section className="mt-12 space-y-6">
        <div className="paper-card rounded-[28px] p-5 md:p-7">
          <p className="text-lg leading-relaxed md:text-xl">{speech}</p>
          <form
            className="mt-5 flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              if (prompt.trim()) {
                void chat(prompt.trim());
                setPrompt("");
              }
            }}
          >
            <label className="sr-only" htmlFor="ask">
              Ask your kitchen friend
            </label>
            <input
              id="ask"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="I have no idea what to make."
              className="min-h-14 flex-1 rounded-full border border-[var(--line)] bg-paper px-5 text-lg"
            />
            <Button type="submit" disabled={loading}>
              {loading ? "Looking..." : "Ask"}
            </Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip onClick={() => void chat("What should I make tonight?")}>What should I make?</Chip>
            <Chip onClick={() => void loadDinner({ healthier: true })}>Something healthier</Chip>
            <Chip onClick={() => void loadDinner({ faster: true, maxMinutes: 20 })}>Something faster</Chip>
            <Chip onClick={() => void chat("I don't want to go to the store")}>No store trip</Chip>
            <Chip onClick={() => void chat("I have leftover chicken, rice, and vegetables from last night")}>
              What&apos;s left?
            </Chip>
          </div>
        </div>

        {pick ? (
          <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
            <div>
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-olive">My pick</p>
              <RecipeCard
                featured
                recipe={pick}
                onCook={() => void startCook(pick)}
                onShop={() => {
                  sessionStorage.setItem("kf:shop", JSON.stringify(pick.missing));
                  sessionStorage.setItem("kf:shopTitle", pick.title);
                  router.push("/shop");
                }}
              />
            </div>
            <div className="space-y-4">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-ink-soft">Or...</p>
              {alts.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onCook={() => void startCook(recipe)}
                  onShop={() => {
                    sessionStorage.setItem("kf:shop", JSON.stringify(recipe.missing));
                    sessionStorage.setItem("kf:shopTitle", recipe.title);
                    router.push("/shop");
                  }}
                />
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function FridgeArt() {
  return (
    <div className="paper-card relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-[36px] p-8">
      <div className="absolute inset-6 rounded-[28px] border-4 border-ink/80 bg-gradient-to-b from-[#d7ecf2] to-[#f7f3ea]">
        <div className="absolute left-3 right-3 top-6 h-16 rounded-xl bg-white/70 shadow-inner" />
        <div className="absolute left-4 top-28 h-10 w-16 rounded-lg bg-tomato/80" />
        <div className="absolute right-6 top-28 h-14 w-10 rounded-lg bg-olive/70" />
        <div className="absolute bottom-8 left-6 right-6 h-20 rounded-2xl bg-[#f3d7a4]" />
        <div className="absolute bottom-12 left-10 h-8 w-8 rounded-full bg-terracotta" />
        <div className="absolute bottom-14 right-12 h-6 w-14 rounded-md bg-sage" />
      </div>
      <p className="relative mt-[85%] text-center text-sm font-bold text-ink-soft">Open the door. I&apos;ll take it from there.</p>
    </div>
  );
}
