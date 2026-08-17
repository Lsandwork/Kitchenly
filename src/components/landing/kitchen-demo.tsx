"use client";

import { useEffect, useState } from "react";
import { CartIcon, ScanIcon } from "@/components/kf/icons";

const INGREDIENTS = ["Chicken", "Spinach", "Garlic", "Lemon", "Parmesan", "Rice"] as const;

export function KitchenDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;

    let cancelled = false;
    const timers: number[] = [];
    const run = () => {
      if (cancelled) return;
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return;
          setStep(0);
          timers.push(window.setTimeout(() => !cancelled && setStep(1), 900));
          timers.push(window.setTimeout(() => !cancelled && setStep(2), 2800));
          timers.push(window.setTimeout(() => !cancelled && setStep(3), 4800));
        }, 0),
      );
    };
    run();
    const loop = window.setInterval(run, 8200);
    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
      window.clearInterval(loop);
    };
  }, []);

  return (
    <div className="kf-landing-demo" aria-label="Dishly product demonstration">
      <div
        className={`kf-landing-demo-stage ${step >= 1 ? "show-chips" : ""} ${step >= 2 ? "show-match" : ""} ${step >= 3 ? "show-shop" : ""}`}
      >
        <div className="kf-landing-demo-scan">
          <div className="kf-landing-demo-scan-top">
            <span className="kf-landing-demo-pulse" />
            <p>
              <ScanIcon size={14} />
              {step < 2 ? "Scanning your fridge…" : "Kitchen ready"}
            </p>
          </div>
          <div className="kf-landing-demo-chips">
            {INGREDIENTS.map((name, index) => (
              <span key={name} className="kf-landing-demo-chip" style={{ animationDelay: `${index * 120}ms` }}>
                {name}
              </span>
            ))}
          </div>
        </div>

        <div className="kf-landing-demo-match">
          <p className="kf-landing-demo-match-label">6 dinners match your kitchen</p>
          <article className="kf-landing-demo-recipe">
            <div className="kf-landing-demo-recipe-media" />
            <div className="kf-landing-demo-recipe-body">
              <p className="kf-landing-demo-recipe-meta">25 min · Kitchen Match 92%</p>
              <h3 className="display">Creamy Lemon Chicken</h3>
              <p>You already have 7 of 8 ingredients</p>
            </div>
          </article>
        </div>

        <div className="kf-landing-demo-shop">
          <div>
            <p className="kf-landing-demo-shop-label">Missing</p>
            <p className="display kf-landing-demo-shop-item">Heavy cream</p>
          </div>
          <span className="kf-landing-demo-shop-cta">
            <CartIcon size={14} />
            Add to shopping
          </span>
        </div>
      </div>
    </div>
  );
}
