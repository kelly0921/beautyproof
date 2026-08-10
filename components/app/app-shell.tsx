"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type IconName = "home" | "scan" | "proofs" | "profile";

const navigation: { href: string; label: string; icon: IconName }[] = [
  { href: "/app", label: "Home", icon: "home" },
  { href: "/app/scan", label: "Scan", icon: "scan" },
  { href: "/app/proofs", label: "Proofs", icon: "proofs" },
  { href: "/app/profile", label: "Profile", icon: "profile" },
];

function AppIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="M3 10.8 12 3l9 7.8" /><path d="M5.5 9.5V21h13V9.5M9.5 21v-7h5v7" /></>,
    scan: <><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><path d="M9 10.5c.7-.9 1.7-1.5 3-1.5s2.3.6 3 1.5M9.5 15c.7.7 1.5 1 2.5 1s1.8-.3 2.5-1" /></>,
    proofs: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
  };
  return <svg aria-hidden="true" className="app-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">{paths[name]}</svg>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const active = (href: string) => href === "/app" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="app-experience">
      <aside className="app-sidebar">
        <Link className="app-wordmark" href="/app" aria-label="BeautyProof app home">
          <span className="app-wordmark-mark">B</span>
          <span>BeautyProof</span>
        </Link>
        <nav className="app-side-nav" aria-label="App navigation">
          {navigation.map((item) => <Link aria-current={active(item.href) ? "page" : undefined} className={active(item.href) ? "active" : ""} href={item.href} key={item.href}><AppIcon name={item.icon} /><span>{item.label}</span></Link>)}
        </nav>
        <div className="app-sidebar-note"><span className="app-live-dot" />YouCam analysis · consent controlled</div>
        <Link className="app-judge-link" href="/demo">Open judge demo ↗</Link>
      </aside>

      <div className="app-stage">
        <header className="app-mobile-header">
          <Link className="app-wordmark" href="/app"><span className="app-wordmark-mark">B</span><span>BeautyProof</span></Link>
          <Link className="app-avatar" href="/app/profile" aria-label="Open profile">KC</Link>
        </header>
        <main className="app-main">{children}</main>
        <nav className="app-bottom-nav" aria-label="App navigation">
          {navigation.map((item) => <Link aria-current={active(item.href) ? "page" : undefined} className={active(item.href) ? "active" : ""} href={item.href} key={item.href}><AppIcon name={item.icon} /><span>{item.label}</span></Link>)}
        </nav>
      </div>
    </div>
  );
}
