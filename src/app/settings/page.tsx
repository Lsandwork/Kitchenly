"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Chip } from "@/components/ui";

const DIETS = ["vegetarian", "vegan", "pescatarian", "gluten-free", "dairy-free", "low-carb", "high-protein"];
const ALLERGIES = ["peanut", "tree-nut", "dairy", "egg", "gluten", "soy", "shellfish", "fish", "sesame"];
const EQUIPMENT = ["stovetop", "oven", "microwave", "air-fryer", "slow-cooker", "instant-pot", "blender", "grill"];

export default function SettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [guest, setGuest] = useState(true);
  const [message, setMessage] = useState("");
  const [diets, setDiets] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>(["stovetop", "oven", "microwave"]);
  const [servings, setServings] = useState(2);
  const [minutes, setMinutes] = useState(30);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.json())
      .then((data) => {
        setGuest(data.user?.guest ?? true);
        setDiets(data.prefs?.diets ?? []);
        setAllergies(data.prefs?.allergies ?? []);
        setEquipment(data.prefs?.equipment ?? equipment);
        setServings(data.prefs?.typicalServings ?? 2);
        setMinutes(data.prefs?.preferredTimeMinutes ?? 30);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(list: string[], value: string, setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  async function savePrefs() {
    await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        diets,
        allergies,
        equipment,
        typicalServings: servings,
        preferredTimeMinutes: minutes,
      }),
    });
    setMessage("Got it. I'll cook like this from now on.");
  }

  async function auth(action: string) {
    const res = await fetch("/api/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, email, password }),
    });
    const data = await res.json();
    setMessage(res.ok ? "Kitchen saved to this account." : data.error);
    if (res.ok) setGuest(false);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-8 space-y-10">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-terracotta">You</p>
        <h1 className="display mt-2 text-4xl">How you like to cook</h1>
        {message ? <p className="mt-3 text-olive">{message}</p> : null}
      </div>

      <section className="space-y-3">
        <h2 className="display text-2xl">Allergies — hard rules</h2>
        <p className="text-ink-soft">These never get overridden by a casual substitution.</p>
        <div className="flex flex-wrap gap-2">
          {ALLERGIES.map((item) => (
            <Chip key={item} active={allergies.includes(item)} onClick={() => toggle(allergies, item, setAllergies)}>
              {item}
            </Chip>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="display text-2xl">Preferences</h2>
        <div className="flex flex-wrap gap-2">
          {DIETS.map((item) => (
            <Chip key={item} active={diets.includes(item)} onClick={() => toggle(diets, item, setDiets)}>
              {item}
            </Chip>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="display text-2xl">What can you cook with?</h2>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT.map((item) => (
            <Chip key={item} active={equipment.includes(item)} onClick={() => toggle(equipment, item, setEquipment)}>
              {item}
            </Chip>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <label className="paper-card rounded-3xl p-4">
          Usual servings
          <input
            type="number"
            min={1}
            max={8}
            value={servings}
            onChange={(event) => setServings(Number(event.target.value))}
            className="mt-2 min-h-12 w-full rounded-full bg-paper px-4"
          />
        </label>
        <label className="paper-card rounded-3xl p-4">
          Weeknight time (minutes)
          <input
            type="number"
            min={10}
            max={120}
            value={minutes}
            onChange={(event) => setMinutes(Number(event.target.value))}
            className="mt-2 min-h-12 w-full rounded-full bg-paper px-4"
          />
        </label>
      </section>
      <Button onClick={() => void savePrefs()}>Save this</Button>

      <section className="space-y-3">
        <h2 className="display text-2xl">{guest ? "Keep this kitchen" : "You're signed in"}</h2>
        {guest ? (
          <>
            <input className="min-h-12 w-full rounded-full bg-cream px-4" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="min-h-12 w-full rounded-full bg-cream px-4" placeholder="Password (8+)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <div className="flex gap-3">
              <Button onClick={() => void auth("register")}>Save my kitchen</Button>
              <Button tone="secondary" onClick={() => void auth("login")}>
                Log in
              </Button>
            </div>
          </>
        ) : (
          <Button tone="secondary" onClick={() => void auth("logout")}>
            Log out
          </Button>
        )}
      </section>

      <section className="space-y-2 text-ink-soft">
        <Link className="font-bold text-ink" href="/privacy">
          Privacy and deletion
        </Link>
        <p>Kitchen photos can be personal. You can delete scans, inventory, and your account anytime.</p>
        <Button
          tone="ghost"
          onClick={async () => {
            await fetch("/api/me", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete" }) });
            router.push("/");
          }}
        >
          Delete my data
        </Button>
      </section>
    </main>
  );
}
