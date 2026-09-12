import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sewa First Innovation Challenge, Under Sewa Sankalp Abhiyan",
  description: "Innovation challenge platform",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
