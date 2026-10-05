import { AppShell } from "@/components/app-shell";
import { verifySession } from "@/lib/auth/dal";

export default async function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();
  return (
    <AppShell
      user={{ name: session.name, email: session.email, role: session.role }}
    >
      {children}
    </AppShell>
  );
}
