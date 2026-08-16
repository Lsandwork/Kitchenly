"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FridgeHero } from "@/components/kf/fridge-hero";
import {
  CartIcon,
  ChefHatIcon,
  ClockIcon,
  JarIcon,
  LeafIcon,
  ScanIcon,
  SparkleIcon,
} from "@/components/kf/icons";
import { RecipeCard, type ClientRecipe } from "@/components/recipe-card";
import { Button, ButtonLink, SuggestionChip } from "@/components/ui";

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
  const searchParams = useSearchParams();
  const forceLanding = searchParams.get("view") === "landing";
  const askParam = searchParams.get("ask")?.trim() || "";
  const [me, setMe] = useState<MeResponse | null>(null);
  const [speech, setSpeech] = useState("Show me what you've got. I'll figure out dinner.");
  const [pick, setPick] = useState<ClientRecipe | null>(null);
  const [alts, setAlts] = useState<ClientRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState(askParam);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.json())
      .then((data) => {
        setMe(data);
        if (!forceLanding && data.kitchen?.length && !askParam) void loadDinner();
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceLanding]);

  useEffect(() => {
    if (!askParam) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      setSpeech("On it.");
      void fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: askParam }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;
          setSpeech(data.speech);
          setPick(data.pick);
          setAlts(data.alternatives ?? []);
          if (data.pick) sessionStorage.setItem("kf:pick", JSON.stringify(data.pick));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [askParam]);

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
  const hasKitchen = !forceLanding && Boolean(me?.kitchen?.length);

  return (
    <main className="relative overflow-x-clip pb-20">
      {!hasKitchen ? (
        <section className="kf-page grid items-center gap-8 pt-6 md:gap-10 md:pt-8 lg:grid-cols-[1.08fr_.92fr] lg:gap-6 lg:pt-6 lg:pb-2">
          <div className="space-y-5 md:space-y-6">
            <p className="kf-eyebrow">
              <LeafIcon size={14} />
              Your kitchen friend
            </p>
            <h1 className="display max-w-[10.5ch] text-[3.05rem] font-semibold leading-[0.96] tracking-[-0.045em] text-[var(--kf-espresso)] sm:text-[3.75rem] md:text-[4.4rem] lg:text-[4.85rem]">
              What&apos;s in your kitchen?
            </h1>
            <p className="max-w-[28rem] text-[1.05rem] leading-[1.55] text-[var(--kf-text-muted)] md:text-[1.15rem]">
              Show me what you&apos;ve got in your fridge and pantry. I&apos;ll suggest delicious dinner ideas.
            </p>
            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
              <ButtonLink href="/scan" tone="olive" className="min-h-[3.35rem] px-7 text-[1.02rem]">
                <ScanIcon size={18} />
                Scan my fridge
              </ButtonLink>
              <ButtonLink href="/kitchen?mode=type" tone="secondary" className="min-h-[3.35rem] px-7 text-[1.02rem]">
                <LeafIcon size={16} />
                Tell me what I have
              </ButtonLink>
            </div>
          </div>
          <FridgeHero />
        </section>
      ) : (
        <section className="kf-page space-y-8 pt-8 md:pt-12">
          <div className="space-y-3">
            <p className="kf-eyebrow">
              <LeafIcon size={14} />
              Tonight
            </p>
            <h1 className="display max-w-3xl text-4xl font-semibold leading-[1.02] md:text-6xl">
              I&apos;ve got a few ideas for you.
            </h1>
            <p className="max-w-2xl text-xl text-[var(--kf-text-muted)]">
              You&apos;ve got {me!.kitchen.slice(0, 4).map((item) => item.name).join(", ")}
              {me!.kitchen.length > 4 ? ", and a few other things" : ""} looking at you.
            </p>
          </div>
          {urgent ? (
            <div className="kf-card rounded-[28px] p-5 md:p-6">
              <p className="kf-eyebrow">Use this first</p>
              <p className="display mt-2 text-3xl">{urgent.name}</p>
              <p className="mt-1 text-[var(--kf-text-muted)]">Let&apos;s rescue this before it gets sad.</p>
            </div>
          ) : null}
        </section>
      )}

      <section className="kf-page relative z-20 mt-2 md:-mt-4 lg:-mt-8">
        <div className="kf-floating rounded-[32px] p-5 md:rounded-[36px] md:p-7">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 text-[var(--kf-terracotta)]">
              <SparkleIcon size={16} />
            </span>
            <p className="text-[1.02rem] font-medium leading-snug text-[var(--kf-espresso)] md:text-[1.08rem]">
              {hasKitchen ? speech : "Show me what you've got. I'll figure out dinner."}
            </p>
          </div>

          <form
            className="mt-5"
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
            <div className="flex min-h-[3.6rem] items-center gap-2 rounded-full border border-[var(--kf-border-strong)] bg-[var(--kf-surface)] p-1.5 pl-5 shadow-[inset_0_1px_0_rgba(255,255,255,.7)] focus-within:border-[color-mix(in_srgb,var(--kf-terracotta)_45%,var(--kf-border-strong))] focus-within:shadow-[0_0_0_4px_rgba(192,86,33,.08)]">
              <input
                id="ask"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="I have no idea what to make."
                className="min-w-0 flex-1 bg-transparent py-2 text-[1.02rem] text-[var(--kf-espresso)] outline-none placeholder:text-[color-mix(in_srgb,var(--kf-text-muted)_80%,transparent)]"
              />
              <Button type="submit" tone="ask" disabled={loading} className="min-h-11 shrink-0 px-5">
                <SparkleIcon size={14} />
                {loading ? "Looking..." : "Ask"}
              </Button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <SuggestionChip icon={<ChefHatIcon size={15} />} onClick={() => void chat("What should I make tonight?")}>
              What should I make?
            </SuggestionChip>
            <SuggestionChip icon={<LeafIcon size={15} />} onClick={() => void loadDinner({ healthier: true })}>
              Something healthier
            </SuggestionChip>
            <SuggestionChip
              icon={<ClockIcon size={15} />}
              onClick={() => void loadDinner({ faster: true, maxMinutes: 20 })}
            >
              Something faster
            </SuggestionChip>
            <SuggestionChip icon={<CartIcon size={15} />} onClick={() => void chat("I don't want to go to the store")}>
              No store trip
            </SuggestionChip>
            <SuggestionChip
              icon={<JarIcon size={15} />}
              onClick={() => void chat("I have leftover chicken, rice, and vegetables from last night")}
            >
              What&apos;s left?
            </SuggestionChip>
          </div>
        </div>

        {pick ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
            <div>
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-[var(--kf-olive)]">My pick</p>
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
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--kf-text-muted)]">Or...</p>
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
