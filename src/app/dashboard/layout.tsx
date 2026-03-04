import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="flex h-14 items-center justify-between border-b border-border bg-sidebar px-4 md:px-6">
        <Link href="/dashboard" className="flex items-baseline gap-2">
          <span className="text-lg font-mono font-bold text-sidebar-primary">
            CyberStudy
          </span>
          <span className="hidden text-xs text-muted-foreground font-mono sm:inline">
            // study scheduler
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground truncate sm:inline">
            {session.user.name}
          </span>
          <LogoutButton />
        </div>
      </header>

      <main className="p-4 md:p-6 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
