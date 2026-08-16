import { Suspense } from "react";
import KitchenPage from "./kitchen-client";

export default function Page() {
  return (
    <Suspense fallback={<main className="px-4 py-10">Opening your kitchen...</main>}>
      <KitchenPage />
    </Suspense>
  );
}
