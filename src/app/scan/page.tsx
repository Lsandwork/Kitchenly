"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button, ButtonLink, Chip } from "@/components/ui";

const LOCATIONS = ["fridge", "freezer", "pantry", "counter", "cabinet"] as const;

type ScanItem = {
  id: string;
  name: string;
  confidence: number;
  confirmed: boolean;
  quantityNote?: string | null;
};

export default function ScanPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [location, setLocation] = useState<(typeof LOCATIONS)[number]>("fridge");
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [speech, setSpeech] = useState("Show me a shelf. One photo is rarely the whole kitchen.");
  const [items, setItems] = useState<ScanItem[]>([]);
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
    const form = new FormData();
    form.set("location", location);
    for (const file of batch) form.append("photos", file);
    try {
      const res = await fetch("/api/scan", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setSpeech(data.error || "I couldn't read that clearly. Scan another photo, or just tell me what's there.");
        return;
      }
      setSpeech(data.speech);
      setItems(data.items ?? []);
      setUsedVision(data.usedVision);
      setFiles([]);
      setPreviews([]);
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
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-8">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-terracotta">Fridge scanner</p>
      <h1 className="display mt-2 text-4xl font-semibold md:text-5xl">Show me your kitchen.</h1>
      <p className="mt-3 text-lg text-ink-soft">{speech}</p>

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
        onChange={(event) => addFiles(event.target.files)}
      />

      <div className="mt-6 grid gap-3">
        <Button className="min-h-16 text-lg" onClick={() => inputRef.current?.click()}>
          {files.length ? "Add another photo" : "Take or upload a photo"}
        </Button>
        <ButtonLink href="/kitchen?mode=type" tone="secondary">
          Prefer typing? Tell me what you&apos;ve got.
        </ButtonLink>
      </div>

      {previews.length ? (
        <div className="mt-6 grid grid-cols-3 gap-3">
          {previews.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" className="h-28 w-full rounded-2xl object-cover" />
          ))}
        </div>
      ) : null}

      {files.length ? (
        <Button className="mt-4 w-full min-h-14" disabled={busy} onClick={() => void scan()}>
          {busy ? "Looking at your kitchen..." : `Scan ${files.length} photo${files.length > 1 ? "s" : ""}`}
        </Button>
      ) : null}

      {usedVision === false ? (
        <p className="mt-4 text-sm text-ink-soft">
          I don&apos;t have a vision model configured on this server, so I can&apos;t read the photo yet. Your pictures are stored privately. Add an AI key, or just tell me the ingredients.
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
          <p className="text-ink-soft">Tap anything I got wrong. Then scan another shelf, or let me cook.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button tone="secondary" onClick={() => inputRef.current?.click()}>
              Scan another photo
            </Button>
            <Button onClick={() => router.push("/")}>What should I make?</Button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
