import { AppShell } from "@/components/app/app-shell";

export default function BeautyProofAppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
