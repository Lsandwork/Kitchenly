"use client";

import { useSearchParams } from "next/navigation";
import { AuthForm } from "@/components/auth-form";

export function LoginClient() {
  const params = useSearchParams();
  return <AuthForm mode="login" next={params.get("next") || undefined} />;
}
