import type { Metadata } from "next";
import "./admin-dashboard.css";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

/** Full-bleed admin shell — no normal app chrome inside this segment. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="kf-admin-root min-h-screen">{children}</div>;
}
