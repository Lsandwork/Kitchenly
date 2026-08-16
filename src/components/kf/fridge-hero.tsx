import Image from "next/image";
import { SparkleIcon } from "@/components/kf/icons";

export function FridgeHero() {
  return (
    <div className="relative mx-auto w-full max-w-[460px] lg:mr-0 lg:max-w-none">
      <div className="relative mx-auto aspect-[3/4] w-full max-w-[400px] lg:max-w-[440px]">
        <Image
          src="/assets/fridge-hero.png"
          alt="Open refrigerator filled with fresh ingredients"
          fill
          priority
          unoptimized
          sizes="(max-width: 1024px) 90vw, 440px"
          className="object-contain object-bottom drop-shadow-[0_28px_48px_rgba(42,26,18,.18)]"
        />

        <div className="pointer-events-none absolute inset-[18%_22%_28%_18%] kf-scan-pulse" aria-hidden>
          <span className="absolute left-0 top-0 h-7 w-7 border-l-[3px] border-t-[3px] border-white drop-shadow" />
          <span className="absolute right-0 top-0 h-7 w-7 border-r-[3px] border-t-[3px] border-white drop-shadow" />
          <span className="absolute bottom-0 left-0 h-7 w-7 border-b-[3px] border-l-[3px] border-white drop-shadow" />
          <span className="absolute bottom-0 right-0 h-7 w-7 border-b-[3px] border-r-[3px] border-white drop-shadow" />
        </div>

        <aside className="absolute bottom-[5%] right-[-4%] z-10 w-[min(100%,248px)] rounded-[22px] border border-[var(--kf-border)] bg-white p-4 shadow-[var(--kf-shadow-floating)] sm:right-0 sm:w-[255px]">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[color-mix(in_srgb,var(--kf-terracotta)_12%,white)] text-[var(--kf-terracotta)]">
              <SparkleIcon size={14} />
            </span>
            <p className="text-sm font-bold text-[var(--kf-espresso)]">Kitchen Friend</p>
          </div>
          <p className="mt-2 text-[0.9rem] leading-snug text-[var(--kf-text-muted)]">
            I&apos;ve found 12 fresh ingredients.
            <br />
            Let&apos;s make something delicious.
          </p>
          <div className="mt-3 flex items-center gap-2">
            {[
              { bg: "#f2d4c8", emoji: "🍅" },
              { bg: "#dce7d4", emoji: "🌿" },
              { bg: "#f5ebc5", emoji: "🍋" },
            ].map((chip) => (
              <span
                key={chip.emoji}
                className="grid h-9 w-9 place-items-center rounded-[10px] text-base"
                style={{ background: chip.bg }}
                aria-hidden
              >
                {chip.emoji}
              </span>
            ))}
            <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[#efe8dc] text-sm font-bold tracking-widest text-[var(--kf-text-muted)]">
              ···
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
