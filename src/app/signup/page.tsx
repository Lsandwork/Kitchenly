import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Sign up | Kitchen Friend",
  description: "Create a Kitchen Friend account to save your kitchen and cook with what you have.",
  robots: { index: false, follow: true },
};

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
