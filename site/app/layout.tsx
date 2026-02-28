import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "smolmodels — Small Model Tracker",
  description:
    "Tracking which small language models (≤15B parameters) are actually ready for real work.",
  openGraph: {
    title: "smolmodels",
    description:
      "Tracking which small language models (≤15B parameters) are actually ready for real work.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
