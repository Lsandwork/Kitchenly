"use client";

import { useState } from "react";
import { CartIcon } from "@/components/kf/icons";
import { Button, Chip, PageShell, SurfaceCard } from "@/components/ui";

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
    <PageShell narrow>
      <p className="kf-eyebrow">
        <CartIcon size={14} />
        Need a few things?
      </p>
      <h1 className="display mt-3 text-4xl font-semibold">Let&apos;s get you what you&apos;re missing</h1>
      <p className="mt-3 text-lg text-[var(--kf-text-muted)]">{title}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <SurfaceCard className="p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--kf-terracotta)]">Need</p>
          <p className="mt-1 display text-2xl">{items.length}</p>
        </SurfaceCard>
        <SurfaceCard className="p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--kf-text-muted)]">Maybe</p>
          <p className="mt-1 display text-2xl">0</p>
        </SurfaceCard>
        <SurfaceCard className="p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--kf-olive)]">Already have</p>
          <p className="mt-1 display text-2xl">—</p>
        </SurfaceCard>
      </div>

      <ul className="mt-6 space-y-2">
        {items.length ? (
          items.map((item) => (
            <li key={item.name}>
              <SurfaceCard className="flex items-center justify-between px-4 py-3">
                <span className="font-bold">
                  {item.quantity ? `${item.quantity} ${item.unit ?? ""} ` : ""}
                  {item.name}
                </span>
                <Chip onClick={() => setItems((current) => current.filter((row) => row.name !== item.name))}>
                  Already have this
                </Chip>
              </SurfaceCard>
            </li>
          ))
        ) : (
          <li className="text-[var(--kf-text-muted)]">Nothing to buy — you already have everything.</li>
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
            className="min-h-12 w-full rounded-full border border-[var(--kf-border-strong)] bg-[var(--kf-surface-elevated)] px-4 shadow-[var(--kf-shadow-subtle)] outline-none"
          />
          <Button className="w-full min-h-14 text-lg" tone="olive" disabled={busy} onClick={() => void locate()}>
            Find these ingredients locally?
          </Button>
        </div>
      ) : null}

      {offer ? (
        <section className="mt-10 space-y-6">
          <div>
            <h2 className="display text-3xl">Nearby</h2>
            <p className="mt-2 text-[var(--kf-text-muted)]">{offer.disclaimer}</p>
            <div className="mt-4 space-y-3">
              {offer.stores.map((store) => (
                <a key={store.id} href={store.mapsUrl} target="_blank" rel="noreferrer" className="block">
                  <SurfaceCard className="p-4 hover:shadow-[var(--kf-shadow-floating)]">
                    <p className="font-bold">{store.name}</p>
                    <p className="text-sm text-[var(--kf-text-muted)]">
                      {store.distanceMiles ? `${store.distanceMiles} miles · ` : ""}
                      {store.availability === "likely"
                        ? "Likely has it"
                        : store.availability === "confirmed"
                          ? "Confirmed available"
                          : "Search nearby"}
                    </p>
                    <p className="text-sm text-[var(--kf-text-muted)]">{store.availabilityNote}</p>
                  </SurfaceCard>
                </a>
              ))}
            </div>
          </div>
          {offer.delivery.length ? (
            <div>
              <h2 className="display text-3xl">Delivery</h2>
              <div className="mt-4 space-y-3">
                {offer.delivery.map((option) => (
                  <SurfaceCard key={option.provider} className="p-4">
                    <p className="font-bold">{option.label}</p>
                    <p className="text-sm text-[var(--kf-text-muted)]">{option.note}</p>
                    {option.href ? (
                      <a
                        className="mt-3 inline-flex min-h-12 items-center font-bold text-[var(--kf-terracotta)]"
                        href={option.href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {option.cta}
                      </a>
                    ) : null}
                  </SurfaceCard>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </PageShell>
  );
}
