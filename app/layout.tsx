import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SudharsanGPT",
  description: "SudharsanGPT — a fast, minimal AI chat assistant.",
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
