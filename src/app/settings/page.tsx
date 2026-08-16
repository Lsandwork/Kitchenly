"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserIcon } from "@/components/kf/icons";
import { Button, ButtonLink, Chip, PageShell, SurfaceCard } from "@/components/ui";

const DIETS = ["vegetarian", "vegan", "pescatarian", "gluten-free", "dairy-free", "low-carb", "high-protein"];
const ALLERGIES = ["peanut", "tree-nut", "dairy", "egg", "gluten", "soy", "shellfish", "fish", "sesame"];
const EQUIPMENT = ["stovetop", "oven", "microwave", "air-fryer", "slow-cooker", "instant-pot", "blender", "grill"];

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [guest, setGuest] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState("");
  const [diets, setDiets] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>(["stovetop", "oven", "microwave"]);
  const [servings, setServings] = useState(2);
  const [minutes, setMinutes] = useState(30);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me", { credentials: "same-origin" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const user = data.user;
        const isGuest = Boolean(user?.guest ?? !user?.email);
        setGuest(isGuest);
        setAccountEmail(user?.email ?? null);
        setIsAdmin(user?.role === "admin");
        setDiets(data.prefs?.diets ?? []);
        setAllergies(data.prefs?.allergies ?? []);
        setEquipment(data.prefs?.equipment ?? ["stovetop", "oven", "microwave"]);
        setServings(data.prefs?.typicalServings ?? 2);
        setMinutes(data.prefs?.preferredTimeMinutes ?? 30);
      })
      .catch(() => {
        if (!cancelled) setMessage("Couldn’t load your account. Refresh and try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(list: string[], value: string, setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  async function savePrefs() {
    await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
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

  async function logout() {
    await fetch("/api/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ action: "logout" }),
    });
    setGuest(true);
    setAccountEmail(null);
    setIsAdmin(false);
    setMessage("Logged out.");
    router.push("/login");
    router.refresh();
  }

  async function updatePassword() {
    if (newPassword !== confirmPassword) {
      setMessage("New passwords don’t match.");
      return;
    }
    const res = await fetch("/api/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        action: "change_password",
        currentPassword,
        newPassword,
      }),
    });
    const data = await res.json();
    setMessage(res.ok ? "Password updated." : data.error || "Couldn’t update password.");
    if (res.ok) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  return (
    <PageShell narrow className="space-y-10">
      <div>
        <p className="kf-eyebrow">
          <UserIcon size={14} />
          You
        </p>
        <h1 className="display mt-3 text-4xl">How you like to cook</h1>
        {message ? <p className="mt-3 text-[var(--kf-olive)]">{message}</p> : null}
      </div>

      <SurfaceCard className="space-y-4 p-5 md:p-6">
        <h2 className="display text-2xl">Account</h2>
        {loading ? (
          <p className="text-[var(--kf-text-muted)]">Checking your kitchen account…</p>
        ) : guest ? (
          <>
            <p className="text-[var(--kf-text-muted)]">You’re browsing as a guest. Log in or sign up to save your kitchen.</p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/login" tone="olive">
                Log in
              </ButtonLink>
              <ButtonLink href="/signup" tone="secondary">
                Sign up
              </ButtonLink>
            </div>
          </>
        ) : (
          <>
            <p className="font-semibold text-[var(--kf-espresso)]">{accountEmail}</p>
            {isAdmin ? <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--kf-terracotta)]">Admin</p> : null}
            <div className="flex flex-wrap gap-3">
              {isAdmin ? (
                <ButtonLink href="/admin" tone="olive">
                  Admin Panel
                </ButtonLink>
              ) : null}
              <Button tone="secondary" onClick={() => void logout()}>
                Log out
              </Button>
            </div>
          </>
        )}
      </SurfaceCard>

      {!loading && !guest ? (
        <SurfaceCard className="space-y-3 p-5 md:p-6">
          <h2 className="display text-2xl">Change password</h2>
          <p className="text-[var(--kf-text-muted)]">Use at least 8 characters.</p>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="min-h-12 w-full rounded-full border border-[var(--kf-border-strong)] bg-[var(--kf-surface)] px-4 outline-none"
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="New password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="min-h-12 w-full rounded-full border border-[var(--kf-border-strong)] bg-[var(--kf-surface)] px-4 outline-none"
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="min-h-12 w-full rounded-full border border-[var(--kf-border-strong)] bg-[var(--kf-surface)] px-4 outline-none"
          />
          <Button tone="olive" onClick={() => void updatePassword()}>
            Update password
          </Button>
        </SurfaceCard>
      ) : null}

      <SurfaceCard className="space-y-3 p-5 md:p-6">
        <h2 className="display text-2xl">Allergies — hard rules</h2>
        <p className="text-[var(--kf-text-muted)]">These never get overridden by a casual substitution.</p>
        <div className="flex flex-wrap gap-2">
          {ALLERGIES.map((item) => (
            <Chip key={item} active={allergies.includes(item)} onClick={() => toggle(allergies, item, setAllergies)}>
              {item}
            </Chip>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard className="space-y-3 p-5 md:p-6">
        <h2 className="display text-2xl">Preferences</h2>
        <div className="flex flex-wrap gap-2">
          {DIETS.map((item) => (
            <Chip key={item} active={diets.includes(item)} onClick={() => toggle(diets, item, setDiets)}>
              {item}
            </Chip>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard className="space-y-3 p-5 md:p-6">
        <h2 className="display text-2xl">What can you cook with?</h2>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT.map((item) => (
            <Chip key={item} active={equipment.includes(item)} onClick={() => toggle(equipment, item, setEquipment)}>
              {item}
            </Chip>
          ))}
        </div>
      </SurfaceCard>

      <section className="grid gap-4 sm:grid-cols-2">
        <label className="kf-card rounded-[28px] p-4">
          Usual servings
          <input
            type="number"
            min={1}
            max={8}
            value={servings}
            onChange={(event) => setServings(Number(event.target.value))}
            className="mt-2 min-h-12 w-full rounded-full bg-[var(--kf-background)] px-4 outline-none"
          />
        </label>
        <label className="kf-card rounded-[28px] p-4">
          Weeknight time (minutes)
          <input
            type="number"
            min={10}
            max={120}
            value={minutes}
            onChange={(event) => setMinutes(Number(event.target.value))}
            className="mt-2 min-h-12 w-full rounded-full bg-[var(--kf-background)] px-4 outline-none"
          />
        </label>
      </section>
      <Button tone="olive" onClick={() => void savePrefs()}>
        Save this
      </Button>

      <section className="space-y-2 text-[var(--kf-text-muted)]">
        <Link className="font-bold text-[var(--kf-espresso)]" href="/privacy">
          Privacy and deletion
        </Link>
        <p>Kitchen photos can be personal. You can delete scans, inventory, and your account anytime.</p>
        <Button
          tone="ghost"
          onClick={async () => {
            await fetch("/api/me", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "same-origin",
              body: JSON.stringify({ action: "delete" }),
            });
            router.push("/");
          }}
        >
          Delete my data
        </Button>
      </section>
    </PageShell>
  );
}
