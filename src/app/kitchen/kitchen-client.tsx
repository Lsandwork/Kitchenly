"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LeafIcon } from "@/components/kf/icons";
import { Button, Chip, PageShell, SurfaceCard } from "@/components/ui";

type Item = {
  id: string;
  name: string;
  quantity?: number | null;
  unit?: string | null;
  location: string;
  confirmed: boolean;
  useSoon: boolean;
  isLeftover: boolean;
  confidence: number;
};

export default function KitchenPage() {
  const params = useSearchParams();
  const [items, setItems] = useState<Item[]>([]);
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<{ id: string; name: string }[]>([]);
  const typing = params.get("mode") === "type" || items.length === 0;

  async function refresh() {
    const res = await fetch("/api/kitchen");
    const data = await res.json();
    setItems(data.kitchen ?? []);
  }

  useEffect(() => {
    fetch("/api/kitchen")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.kitchen)) setItems(data.kitchen);
      });
    fetch("/api/ingredients")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.ingredients)) setSuggestions(data.ingredients);
      });
  }, []);

  async function addText() {
    if (!text.trim()) return;
    await fetch("/api/kitchen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setText("");
    await refresh();
  }

  async function remove(item: Item) {
    await fetch("/api/kitchen", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, names: [item.name] }),
    });
    await refresh();
  }

  async function patch(item: Item, data: Partial<Item>) {
    await fetch("/api/kitchen", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, ...data }),
    });
    await refresh();
  }

  const grouped = items.reduce<Record<string, Item[]>>((acc, item) => {
    const key = item.location || "unknown";
    acc[key] ??= [];
    acc[key].push(item);
    return acc;
  }, {});

  const lastToken = text.split(/[\s,]+/).at(-1)?.toLowerCase() || "";
  const useSoon = items.filter((item) => item.useSoon);

  return (
    <PageShell narrow>
      <p className="kf-eyebrow">
        <LeafIcon size={14} />
        Kitchen memory
      </p>
      <h1 className="display mt-3 text-4xl font-semibold">What you actually have.</h1>
      <p className="mt-3 text-lg text-[var(--kf-text-muted)]">
        {typing
          ? "Prefer typing? Tell me what you've got — a messy sentence is perfect."
          : "Tap to fix quantities, mark leftovers, or say you used something."}
      </p>

      {useSoon.length ? (
        <SurfaceCard className="mt-6 p-5">
          <p className="kf-eyebrow">Use soon</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {useSoon.map((item) => (
              <Chip key={item.id} active onClick={() => void patch(item, { useSoon: false })}>
                {item.name}
              </Chip>
            ))}
          </div>
        </SurfaceCard>
      ) : null}

      <form
        className="mt-6 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void addText();
        }}
      >
        <label htmlFor="have" className="sr-only">
          Ingredients you have
        </label>
        <textarea
          id="have"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          placeholder="I have chicken, rice, onions, half a bell pepper, spinach, eggs, cheddar, milk and tortillas."
          className="w-full rounded-[28px] border border-[var(--kf-border-strong)] bg-[var(--kf-surface-elevated)] p-4 text-lg shadow-[var(--kf-shadow-subtle)] outline-none focus:border-[color-mix(in_srgb,var(--kf-terracotta)_40%,var(--kf-border-strong))]"
        />
        <div className="flex flex-wrap gap-2">
          {suggestions
            .filter((item) => lastToken.length > 1 && item.name.includes(lastToken))
            .slice(0, 6)
            .map((item) => (
              <Chip
                key={item.id}
                onClick={() => setText((current) => `${current.replace(/[^,]*$/, "")}${item.name}, `)}
              >
                {item.name}
              </Chip>
            ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" tone="olive">
            Add to my kitchen
          </Button>
          <Button
            type="button"
            tone="secondary"
            onClick={() => {
              const SpeechCtor = (
                window as Window & {
                  webkitSpeechRecognition?: new () => {
                    lang: string;
                    start: () => void;
                    onresult: ((event: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
                  };
                  SpeechRecognition?: new () => {
                    lang: string;
                    start: () => void;
                    onresult: ((event: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
                  };
                }
              ).webkitSpeechRecognition ??
                (
                  window as Window & {
                    SpeechRecognition?: new () => {
                      lang: string;
                      start: () => void;
                      onresult: ((event: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
                    };
                  }
                ).SpeechRecognition;
              if (!SpeechCtor) {
                setText((current) => current || "Voice isn't available here — type what you've got.");
                return;
              }
              const recognition = new SpeechCtor();
              recognition.lang = "en-US";
              recognition.onresult = (event) => {
                const spoken = event.results[0]?.[0]?.transcript;
                if (spoken) setText((current) => (current ? `${current}, ${spoken}` : spoken));
              };
              recognition.start();
            }}
          >
            Speak it
          </Button>
        </div>
      </form>

      <div className="mt-10 space-y-8">
        {Object.entries(grouped).map(([location, list]) => (
          <section key={location}>
            <h2 className="display text-2xl capitalize">{location}</h2>
            <ul className="mt-3 space-y-2">
              {list.map((item) => (
                <li key={item.id}>
                  <SurfaceCard className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold">
                        {item.name}
                        {item.quantity ? ` · ${item.quantity}${item.unit ? ` ${item.unit}` : ""}` : ""}
                      </p>
                      <p className="text-sm text-[var(--kf-text-muted)]">
                        {item.isLeftover ? "Leftover · " : ""}
                        {item.useSoon ? "Use soon · " : ""}
                        {item.confidence < 0.7 ? "I wasn't sure" : "Confirmed"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Chip onClick={() => void patch(item, { useSoon: !item.useSoon })}>Use soon</Chip>
                      <Chip onClick={() => void patch(item, { isLeftover: !item.isLeftover })}>Leftover</Chip>
                      <Chip onClick={() => void remove(item)}>Used it</Chip>
                    </div>
                  </SurfaceCard>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
