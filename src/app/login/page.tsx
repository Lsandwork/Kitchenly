import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginClient } from "@/components/login-client";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Log in | Dishly",
  description: "Log in to Dishly and pick up your kitchen, recipes, and meal plans.",
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthForm mode="login" />}>
      <LoginClient />
    </Suspense>
  );
}
