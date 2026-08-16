"use client";

import { useState } from "react";
import { Button, Chip } from "@/components/ui";

type Offer = {
  stores: {
    id: string;
    name: string;
    distanceMiles?: number;
    address?: string;
    mapsUrl: string;
    availability: string;
    availabilityNote: string;
    openUntil?: string;
  }[];
  delivery: { provider: string; label: string; available: boolean; cta: string; href?: string; note: string }[];
  disclaimer: string;
};

type Item = { name: string; quantity?: number | null; unit?: string | null; status?: string };

export default function ShopPage() {
  const [items, setItems] = useState<Item[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = sessionStorage.getItem("kf:shop");
    return stored ? (JSON.parse(stored) as Item[]) : [];
  });
  const [title] = useState(() => {
    if (typeof window === "undefined") return "Missing ingredients";
    return sessionStorage.getItem("kf:shopTitle") || "Missing ingredients";
  });
  const [offer, setOffer] = useState<Offer | null>(null);
  const [postal, setPostal] = useState("");
  const [busy, setBusy] = useState(false);

  async function locate() {
    setBusy(true);
    let lat: number | undefined;
    let lng: number | undefined;
    if (navigator.geolocation) {
      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            lat = position.coords.latitude;
            lng = position.coords.longitude;
            resolve();
          },
          () => resolve(),
          { timeout: 4000 },
        );
      });
    }
    const res = await fetch("/api/shopping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, recipeTitle: title, lat, lng, postalCode: postal || undefined }),
    });
    const data = await res.json();
    setOffer(data.offer);
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-8">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-terracotta">Need a few things?</p>
      <h1 className="display mt-2 text-4xl font-semibold">Let&apos;s get you what you&apos;re missing</h1>
      <p className="mt-3 text-lg text-ink-soft">{title}</p>

      <ul className="mt-6 space-y-2">
        {items.length ? (
          items.map((item) => (
            <li key={item.name} className="paper-card flex items-center justify-between rounded-2xl px-4 py-3">
              <span className="font-bold">
                {item.quantity ? `${item.quantity} ${item.unit ?? ""} ` : ""}
                {item.name}
              </span>
              <Chip
                onClick={() => setItems((current) => current.filter((row) => row.name !== item.name))}
              >
                Already have this
              </Chip>
            </li>
          ))
        ) : (
          <li className="text-ink-soft">Nothing to buy — you already have everything.</li>
        )}
      </ul>

      {items.length ? (
        <div className="mt-6 space-y-3">
          <label className="block text-sm font-bold" htmlFor="postal">
            Postal code (optional, if you don&apos;t share location)
          </label>
          <input
            id="postal"
            value={postal}
            onChange={(event) => setPostal(event.target.value)}
            className="min-h-12 w-full rounded-full border border-[var(--line)] bg-cream px-4"
          />
          <Button className="w-full min-h-14 text-lg" disabled={busy} onClick={() => void locate()}>
            Find these ingredients locally?
          </Button>
        </div>
      ) : null}

      {offer ? (
        <section className="mt-10 space-y-6">
          <div>
            <h2 className="display text-3xl">Nearby</h2>
            <p className="mt-2 text-ink-soft">{offer.disclaimer}</p>
            <div className="mt-4 space-y-3">
              {offer.stores.map((store) => (
                <a key={store.id} href={store.mapsUrl} target="_blank" rel="noreferrer" className="paper-card block rounded-3xl p-4">
                  <p className="font-bold">{store.name}</p>
                  <p className="text-sm text-ink-soft">
                    {store.distanceMiles ? `${store.distanceMiles} miles · ` : ""}
                    {store.availability === "likely" ? "Likely has it" : store.availability === "confirmed" ? "Confirmed available" : "Search nearby"}
                  </p>
                  <p className="text-sm text-ink-soft">{store.availabilityNote}</p>
                </a>
              ))}
            </div>
          </div>
          {offer.delivery.length ? (
            <div>
              <h2 className="display text-3xl">Delivery</h2>
              <div className="mt-4 space-y-3">
                {offer.delivery.map((option) => (
                  <div key={option.provider} className="paper-card rounded-3xl p-4">
                    <p className="font-bold">{option.label}</p>
                    <p className="text-sm text-ink-soft">{option.note}</p>
                    {option.href ? (
                      <a className="mt-3 inline-flex min-h-12 items-center font-bold text-terracotta" href={option.href} target="_blank" rel="noreferrer">
                        {option.cta}
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
