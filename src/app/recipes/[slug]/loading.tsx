import { PageShell } from "@/components/ui";

export default function RecipeLoading() {
  return (
    <PageShell>
      <div className="space-y-6" aria-busy="true" aria-label="Opening recipe">
        <div className="overflow-hidden rounded-[24px] border border-[var(--kf-border)] bg-[var(--kf-surface-elevated)] md:rounded-[36px]">
          <div className="kf-skeleton h-[200px] md:h-[420px]" />
          <div className="space-y-3 p-5 md:p-10">
            <div className="kf-skeleton h-6 w-40 rounded-full" />
            <div className="kf-skeleton h-10 w-3/4 rounded-xl" />
            <div className="kf-skeleton h-4 w-full rounded-lg" />
            <div className="kf-skeleton h-4 w-2/3 rounded-lg" />
          </div>
        </div>
        <div className="kf-skeleton h-40 rounded-[28px]" />
      </div>
    </PageShell>
  );
}
