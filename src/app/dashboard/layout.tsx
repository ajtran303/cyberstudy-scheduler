import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-border bg-sidebar p-4 md:flex">
        <div className="mb-8">
          <Link href="/dashboard" className="text-xl font-mono font-bold text-sidebar-primary">
            CyberStudy
          </Link>
          <p className="mt-1 text-xs text-muted-foreground font-mono">
            // study scheduler
          </p>
        </div>
        <nav className="flex flex-col gap-1">
          <Link
            href="/dashboard"
            className="rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            Home Base
          </Link>
        </nav>
        <div className="mt-auto pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground truncate">
            {session.user.name}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {session.user.email}
          </p>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center gap-4 border-b border-border bg-sidebar px-4 md:hidden">
          <Link href="/dashboard" className="text-lg font-mono font-bold text-sidebar-primary">
            CyberStudy
          </Link>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
