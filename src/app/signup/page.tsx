"use client";

import Link from "next/link";
import { useState } from "react";
import { registerUser } from "@/app/actions/auth";
import { signIn } from "next-auth/react";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold text-zinc-900">Create account</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Already have an account?{" "}
        <Link className="text-teal-700 underline" href="/login">
          Sign in
        </Link>
      </p>
      <form
        className="mt-8 flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setPending(true);
          const fd = new FormData(e.currentTarget);
          const r = await registerUser(fd);
          if (!r.ok) {
            setPending(false);
            setError(r.error);
            return;
          }
          const email = String(fd.get("email") ?? "");
          const password = String(fd.get("password") ?? "");
          const res = await signIn("credentials", {
            email,
            password,
            redirect: false,
            callbackUrl: "/dashboard",
          });
          setPending(false);
          if (res?.error) {
            setError("Account created but sign-in failed. Try logging in.");
            return;
          }
          window.location.href = "/dashboard";
        }}
      >
        <label className="block text-sm font-medium text-zinc-700">
          Business name
          <input
            name="businessName"
            required
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Password (8+ characters)
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
          />
        </label>
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-teal-700 py-3 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {pending ? "Creating…" : "Sign up"}
        </button>
      </form>
    </main>
  );
}
