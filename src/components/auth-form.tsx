"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useId, useState } from "react";
import { EyeIcon, EyeOffIcon, SproutIcon } from "@/components/kf/icons";
import { Button } from "@/components/ui";

type Mode = "login" | "signup";

const copy = {
  login: {
    headline: "Welcome back to your kitchen.",
    support: "Pick up your inventory, recipes, and tonight’s ideas.",
    submit: "Log in",
    panelTitle: "Log in",
    panelLede: "Use the email and password for your Dishly account.",
    altPrompt: "New here?",
    altHref: "/signup",
    altLabel: "Create an account",
  },
  signup: {
    headline: "Cook with what you already have.",
    support: "Save your kitchen, get Kitchen Match, and stop wasting dinner ideas.",
    submit: "Create account",
    panelTitle: "Create your account",
    panelLede: "Takes a minute. Your recipes and inventory stay with you.",
    altPrompt: "Already cooking with us?",
    altHref: "/login",
    altLabel: "Log in",
  },
} as const;

export function AuthForm({ mode, next }: { mode: Mode; next?: string }) {
  const router = useRouter();
  const formId = useId();
  const text = copy[mode];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) setChecking(false);
    }, 2500);

    fetch("/api/me")
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data?.user && !data.user.guest) {
          const fallback = data.user.role === "admin" ? "/admin" : "/tonight";
          router.replace(next || fallback);
          return;
        }
        setChecking(false);
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      })
      .finally(() => {
        window.clearTimeout(timer);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [router, next]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const res = await fetch("/api/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          action: mode === "login" ? "login" : "signup",
          email,
          password,
          name: name || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "That didn’t work.");
        return;
      }
      const fallback =
        data.user?.role === "admin" ? "/admin" : mode === "login" ? "/tonight" : "/kitchen";
      router.push(next || fallback);
      router.refresh();
    } catch {
      setMessage("Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  const passwordHint =
    mode === "signup" && password.length > 0 && password.length < 8
      ? "Needs at least 8 characters."
      : mode === "signup" && password.length >= 8
        ? "Looks good."
        : "";

  return (
    <main className="kf-auth">
      <section className="kf-auth-visual">
        <Image
          src="/assets/kitchen-atmosphere.jpg"
          alt=""
          fill
          priority
          quality={90}
          sizes="(max-width: 1023px) 100vw, 54vw"
          className="kf-auth-visual-image object-cover"
        />
        <div className="kf-auth-visual-veil" />
        <div className="kf-auth-visual-copy">
          <Link href="/" className="kf-auth-brand">
            <span className="kf-auth-brand-mark" aria-hidden>
              <SproutIcon size={22} />
            </span>
            <span className="display kf-auth-brand-name">Dishly</span>
          </Link>
          <h1 className="display kf-auth-headline">{text.headline}</h1>
          <p className="kf-auth-support">{text.support}</p>
        </div>
      </section>

      <section className="kf-auth-panel" aria-label={text.panelTitle}>
        <div className={`kf-auth-panel-inner ${checking ? "is-loading" : ""}`}>
          <div className="kf-auth-panel-head">
            <p className="kf-eyebrow">{mode === "login" ? "Welcome back" : "Join in"}</p>
            <h2 className="display kf-auth-panel-title">{text.panelTitle}</h2>
            <p className="kf-auth-panel-lede">{text.panelLede}</p>
          </div>

          {checking ? (
            <div className="kf-auth-skeleton" aria-hidden>
              <div className="kf-auth-skeleton-line" />
              <div className="kf-auth-skeleton-line" />
              <div className="kf-auth-skeleton-line short" />
            </div>
          ) : (
            <form className="kf-auth-form" onSubmit={(event) => void onSubmit(event)}>
              {mode === "signup" ? (
                <label className="kf-auth-field" htmlFor={`${formId}-name`}>
                  <span>Name</span>
                  <input
                    id={`${formId}-name`}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    placeholder="What should we call you?"
                  />
                </label>
              ) : null}

              <label className="kf-auth-field" htmlFor={`${formId}-email`}>
                <span>Email</span>
                <input
                  id={`${formId}-email`}
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@email.com"
                />
              </label>

              <label className="kf-auth-field" htmlFor={`${formId}-password`}>
                <span>Password</span>
                <div className="kf-auth-password">
                  <input
                    id={`${formId}-password`}
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    placeholder={mode === "login" ? "Your password" : "At least 8 characters"}
                  />
                  <button
                    type="button"
                    className="kf-auth-password-toggle"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                </div>
                {passwordHint ? (
                  <span className={`kf-auth-hint ${password.length >= 8 ? "ok" : ""}`} role="status">
                    {passwordHint}
                  </span>
                ) : null}
              </label>

              {message ? (
                <p className="kf-auth-error" role="alert">
                  {message}
                </p>
              ) : null}

              <Button
                type="submit"
                tone="olive"
                className="kf-auth-submit w-full min-h-14 text-[1.02rem]"
                disabled={pending}
              >
                {pending ? "One moment…" : text.submit}
              </Button>
            </form>
          )}

          <div className="kf-auth-footer">
            <p>
              {text.altPrompt}{" "}
              <Link href={text.altHref} className="kf-auth-footer-link">
                {text.altLabel}
              </Link>
            </p>
            <Link href="/recipes" className="kf-auth-browse">
              Browse recipes first
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
