import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Video Moderation Platform",
  description: "Distributed video moderation — Adult Content · AI/Deepfake · Copyright",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 min-h-screen`}>
        <header className="border-b border-slate-200 bg-white">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <span className="font-semibold text-slate-900 tracking-tight">
              VideoMod
            </span>
            <nav className="flex gap-6 text-sm">
              <Link href="/" className="text-slate-600 hover:text-slate-900 transition-colors">
                Upload
              </Link>
              <Link href="/dashboard" className="text-slate-600 hover:text-slate-900 transition-colors">
                Dashboard
              </Link>
            </nav>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-10">{children}</main>
      </body>
    </html>
  );
}
