import { Suspense } from "react";
import KitchenPage from "./kitchen-client";

export default function Page() {
  return (
    <Suspense fallback={<main className="kf-page py-10 text-[var(--kf-text-muted)]">Opening your kitchen...</main>}>
      <KitchenPage />
    </Suspense>
  );
}
