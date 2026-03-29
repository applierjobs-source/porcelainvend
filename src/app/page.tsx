import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          PorcelainVend
        </h1>
        <p className="mt-2 text-zinc-600">
          Web kiosk for Squarespace checkout and SwitchBot unlock.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          className="rounded-lg bg-teal-700 px-5 py-3 text-center font-medium text-white hover:bg-teal-800"
          href="/login"
        >
          Owner login
        </Link>
        <Link
          className="rounded-lg border border-zinc-300 bg-white px-5 py-3 text-center font-medium text-zinc-800 hover:bg-zinc-50"
          href="/signup"
        >
          Sign up
        </Link>
      </div>
    </main>
  );
}
