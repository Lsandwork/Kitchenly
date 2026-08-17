import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import { AppHeader } from "@/components/nav";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#F7F3EC",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "https://trydishly.vercel.app"),
  title: {
    default: "Dishly",
    template: "%s | Dishly",
  },
  description: "Turn what's in your kitchen into tonight's dinner.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Dishly",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${cormorant.variable} ${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col text-ink kf-app-shell">
        <AppHeader />
        <div className="kf-app-main flex-1">{children}</div>
      </body>
    </html>
  );
}
