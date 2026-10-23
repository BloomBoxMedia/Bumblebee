import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bumblebee",
  description: "Filing deadlines for your UK limited companies",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="border-b border-border bg-surface">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3 text-sm">
            <Link href="/" className="text-base font-semibold">
              <span className="text-accent">●</span> Bumblebee
            </Link>
            <Link href="/" className="text-muted hover:text-foreground">
              Deadlines
            </Link>
            <Link href="/companies" className="text-muted hover:text-foreground">
              Companies
            </Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
