import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito } from "next/font/google";
import { Nav } from "@/components/nav";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kitchen Friend",
  description: "Show me what you've got. I'll figure out dinner.",
};

export const viewport: Viewport = {
  themeColor: "#f3eadc",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${nunito.variable} h-full antialiased`}>
      <body className="grain min-h-full flex flex-col text-ink">
        <Nav />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
