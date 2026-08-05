import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "BeautyProof — Skincare reviews from a baseline",
  description: "Formula-specific skincare ProofReceipts from comparable starting measurements.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html data-scroll-behavior="smooth" lang="en">
      <body>
        <div className="site-shell">
          <header className="topbar">
            <Link className="brand" href="/">
              <span className="brand-mark" aria-hidden="true" />
              <span>BeautyProof</span>
            </Link>
            <div className="top-actions">
              <span className="demo-label">Personal cosmetic observation</span>
              <Link className="primary-button" href="/app">Open app</Link>
              <Link className="link-button" href="/demo">Demo</Link>
              <Link className="link-button" href="/proof-coverage">Proof Coverage</Link>
            </div>
          </header>
          {children}
          <footer className="footer">
            <span>BeautyProof prototype · Fictional brand and original product asset</span>
            <span>Cosmetic observation and decision support — not medical diagnosis</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
