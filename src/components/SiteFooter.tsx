"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/kiosk")) return null;

  return (
    <footer className="mt-auto border-t border-zinc-200 bg-white py-6">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-6 text-sm text-zinc-600">
        <Link href="/terms" className="text-teal-700 underline hover:text-teal-800">
          Terms &amp; conditions
        </Link>
        <Link href="/privacy" className="text-teal-700 underline hover:text-teal-800">
          Privacy policy
        </Link>
        <span className="text-zinc-400">·</span>
        <span>PorcelainVend</span>
      </div>
    </footer>
  );
}
