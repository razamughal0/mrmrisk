import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
export const metadata: Metadata = {
  title: "Uplift — Every student. A brighter future.",
  description: "A human-first student success workspace. Spot early warning signs, understand student risk, and turn insight into meaningful support.",
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
