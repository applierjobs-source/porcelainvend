import Link from "next/link";
import type { CSSProperties } from "react";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { themeColor: true },
  });
  const accent =
    user?.themeColor && /^#[0-9A-Fa-f]{6}$/.test(user.themeColor)
      ? user.themeColor
      : "#0f766e";

  return (
    <div
      className="min-h-screen"
      style={{ ["--owner-accent" as string]: accent } as CSSProperties}
    >
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <nav
            className="flex flex-wrap items-center gap-4 text-sm font-medium text-zinc-700"
            style={{ ["--accent" as string]: accent } as CSSProperties}
          >
            <Link href="/dashboard" className="text-zinc-900">
              Overview
            </Link>
            <Link
              href="/dashboard/machines"
              className="hover:opacity-80"
              style={{ color: "var(--accent)" }}
            >
              Machines
            </Link>
            <Link
              href="/dashboard/events"
              className="hover:opacity-80"
              style={{ color: "var(--accent)" }}
            >
              Events
            </Link>
          </nav>
          <div className="flex items-center gap-3 text-sm text-zinc-600">
            <span>{session.user.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-800 hover:bg-zinc-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </div>
  );
}
