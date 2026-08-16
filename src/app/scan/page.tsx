"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { LeafIcon, ScanIcon, SparkleIcon } from "@/components/kf/icons";
import { Button, ButtonLink, Chip, PageShell, SurfaceCard } from "@/components/ui";

const LOCATIONS = ["fridge", "freezer", "pantry", "counter", "cabinet"] as const;

type ScanItem = {
  id: string;
  name: string;
  confidence: number;
  confirmed: boolean;
  quantityNote?: string | null;
};

type RecipeIdea = {
  slug: string;
  title: string;
  imageUrl?: string | null;
  totalMinutes?: number | null;
  kitchenMatchPercent: number;
  why: string;
  missing: string[];
  substitutes: Array<{ original: string; substitute: string; explanation: string }>;
};

export default function ScanPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [location, setLocation] = useState<(typeof LOCATIONS)[number]>("fridge");
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [speech, setSpeech] = useState("Show me a shelf. One photo is rarely the whole kitchen.");
  const [items, setItems] = useState<ScanItem[]>([]);
  const [recipes, setRecipes] = useState<RecipeIdea[]>([]);
  const [busy, setBusy] = useState(false);
  const [usedVision, setUsedVision] = useState<boolean | null>(null);

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const next = [...files, ...Array.from(list)];
    setFiles(next);
    setPreviews(next.map((file) => URL.createObjectURL(file)));
  }

  async function scan(extra?: File[]) {
    const batch = extra ?? files;
    if (!batch.length) return;
    setBusy(true);
    setSpeech("Okay, I'm looking — give me a second with these shelves.");
    setRecipes([]);
    const form = new FormData();
    form.set("location", location);
    for (const file of batch) form.append("photos", file);
    try {
      const res = await fetch("/api/scan", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setSpeech(data.error || "I couldn't read that clearly. Scan another photo, or just tell me what's there.");
        setUsedVision(false);
        return;
      }
      setSpeech(data.speech);
      setItems(data.items ?? []);
      setRecipes(data.recipes ?? []);
      setUsedVision(data.usedVision);
      setFiles([]);
      setPreviews([]);
    } catch {
      setSpeech("Something went wrong reading that photo. Try again, or type what’s in the kitchen.");
      setUsedVision(false);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item: ScanItem) {
    if (item.confirmed) {
      await fetch("/api/kitchen", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, names: [item.name] }),
      });
      setItems((current) => current.filter((row) => row.id !== item.id));
    } else {
      await fetch("/api/kitchen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmIds: [item.id] }),
      });
      setItems((current) => current.map((row) => (row.id === item.id ? { ...row, confirmed: true } : row)));
    }
  }

  return (
    <PageShell narrow>
      <p className="kf-eyebrow">
        <ScanIcon size={14} />
        Fridge scanner
      </p>
      <h1 className="display mt-3 text-4xl font-semibold md:text-5xl">Show me your kitchen.</h1>
      <p className="mt-3 text-lg text-[var(--kf-text-muted)]">{speech}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {LOCATIONS.map((value) => (
          <Chip key={value} active={location === value} onClick={() => setLocation(value)}>
            {value}
          </Chip>
        ))}
      </div>

      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        multiple
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <SurfaceCard className="relative mt-6 overflow-hidden p-5 md:p-7">
        <div className="relative mx-auto aspect-[4/3] max-w-lg overflow-hidden rounded-[28px] border border-[var(--kf-border-strong)] bg-[linear-gradient(180deg,#1f1814_0%,#3a2c24_100%)]">
          <div className="absolute inset-[12%] rounded-[18px] border border-white/10 bg-black/20" />
          <div className="pointer-events-none absolute inset-[18%] kf-scan-pulse" aria-hidden>
            <span className="absolute left-0 top-0 h-8 w-8 border-l-[3px] border-t-[3px] border-white/90" />
            <span className="absolute right-0 top-0 h-8 w-8 border-r-[3px] border-t-[3px] border-white/90" />
            <span className="absolute bottom-0 left-0 h-8 w-8 border-b-[3px] border-l-[3px] border-white/90" />
            <span className="absolute bottom-0 right-0 h-8 w-8 border-b-[3px] border-r-[3px] border-white/90" />
          </div>
          {previews[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previews[0]} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
          ) : (
            <div className="absolute inset-0 grid place-items-center px-6 text-center">
              <div>
                <p className="display text-2xl text-white">Point at a shelf</p>
                <p className="mt-2 text-sm text-white/70">Warm light helps. One clear photo beats five blurry ones.</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-3">
          <Button tone="olive" className="min-h-14 text-lg" onClick={() => inputRef.current?.click()}>
            <ScanIcon size={18} />
            {files.length ? "Add another photo" : "Take or upload a photo"}
          </Button>
          <ButtonLink href="/kitchen?mode=type" tone="secondary">
            <LeafIcon size={16} />
            Prefer typing? Tell me what you&apos;ve got.
          </ButtonLink>
        </div>
      </SurfaceCard>

      {previews.length > 1 ? (
        <div className="mt-6 grid grid-cols-3 gap-3">
          {previews.slice(1).map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" className="h-28 w-full rounded-2xl object-cover shadow-[var(--kf-shadow-subtle)]" />
          ))}
        </div>
      ) : null}

      {files.length ? (
        <Button className="mt-4 w-full min-h-14" tone="ask" disabled={busy} onClick={() => void scan()}>
          <SparkleIcon size={16} />
          {busy ? "Looking at your kitchen..." : `Scan ${files.length} photo${files.length > 1 ? "s" : ""}`}
        </Button>
      ) : null}

      {usedVision === false && !items.length ? (
        <p className="mt-4 text-sm text-[var(--kf-terracotta)]">
          I couldn&apos;t read that photo with vision yet. Try another angle, or{" "}
          <Link href="/kitchen?mode=type" className="font-bold underline">
            type what you have
          </Link>
          .
        </p>
      ) : null}

      {items.length ? (
        <section className="mt-10 space-y-4">
          <h2 className="display text-3xl">I found these in your kitchen</h2>
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <Chip key={item.id} active={item.confirmed} unsure={item.confidence < 0.7} onClick={() => void toggle(item)}>
                {item.confidence < 0.7 ? "? " : "✓ "}
                {item.name}
              </Chip>
            ))}
          </div>
          <p className="text-[var(--kf-text-muted)]">Tap anything I got wrong. Then scan another shelf, or cook from these matches.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button tone="secondary" onClick={() => inputRef.current?.click()}>
              Scan another photo
            </Button>
            <Button tone="olive" onClick={() => router.push("/tonight")}>
              What should I make?
            </Button>
          </div>
        </section>
      ) : null}

      {recipes.length ? (
        <section className="mt-10 space-y-4">
          <h2 className="display text-3xl">Best matches from your kitchen</h2>
          <p className="text-[var(--kf-text-muted)]">Ranked by Kitchen Match — with substitutes when you&apos;re one item short.</p>
          <div className="grid gap-4">
            {recipes.map((recipe) => (
              <Link
                key={recipe.slug}
                href={`/recipes/${recipe.slug}`}
                className="kf-card block overflow-hidden rounded-[28px] transition hover:-translate-y-0.5 hover:shadow-[var(--kf-shadow-floating)]"
              >
                <div className="grid gap-0 sm:grid-cols-[8.5rem_1fr]">
                  <div className="relative min-h-36 bg-[var(--kf-background-deep)] sm:min-h-full">
                    {recipe.imageUrl ? (
                      <Image src={recipe.imageUrl} alt="" fill className="object-cover" sizes="160px" />
                    ) : null}
                  </div>
                  <div className="space-y-2 p-4">
                    <p className="text-sm font-bold text-[var(--kf-olive)]">
                      {recipe.kitchenMatchPercent}% Kitchen Match
                      {recipe.totalMinutes ? ` · ${recipe.totalMinutes} min` : ""}
                    </p>
                    <h3 className="display text-2xl leading-tight">{recipe.title}</h3>
                    <p className="text-sm text-[var(--kf-text-muted)]">{recipe.why}</p>
                    {recipe.missing.length ? (
                      <p className="text-sm text-[var(--kf-terracotta)]">Missing: {recipe.missing.slice(0, 4).join(", ")}</p>
                    ) : (
                      <p className="text-sm font-semibold text-[var(--kf-olive)]">You can make this now.</p>
                    )}
                    {recipe.substitutes.length ? (
                      <ul className="space-y-1 text-sm text-[var(--kf-text-muted)]">
                        {recipe.substitutes.slice(0, 2).map((sub) => (
                          <li key={`${sub.original}-${sub.substitute}`}>
                            Sub: use <span className="font-semibold text-[var(--kf-espresso)]">{sub.substitute}</span> for{" "}
                            {sub.original}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <ButtonLink href="/recipes" tone="secondary">
            Explore all recipes
          </ButtonLink>
        </section>
      ) : null}
    </PageShell>
  );
}
