import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SanjayGPT",
  description: "SanjayGPT — a fast, minimal AI chat assistant.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
