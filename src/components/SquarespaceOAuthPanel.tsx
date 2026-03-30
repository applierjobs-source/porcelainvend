"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { disconnectSquarespaceOAuth } from "@/app/actions/machines";

export function SquarespaceOAuthPanel(props: {
  machineId: string;
  oauthConfigured: boolean;
  oauthConnected: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!props.oauthConfigured) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-700">
        <p className="font-medium text-zinc-900">Connect Squarespace (OAuth)</p>
        <p className="mt-2 text-zinc-600">
          Not available: the server is missing{" "}
          <code className="rounded bg-zinc-100 px-1 font-mono">
            SQUARESPACE_OAUTH_CLIENT_ID
          </code>{" "}
          and{" "}
          <code className="rounded bg-zinc-100 px-1 font-mono">
            SQUARESPACE_OAUTH_CLIENT_SECRET
          </code>
          . Register an OAuth client with Squarespace (
          <a
            href="https://developers.squarespace.com/oauth"
            className="text-teal-700 underline"
            target="_blank"
            rel="noreferrer"
          >
            OAuth guide
          </a>
          ) and set the redirect URI to{" "}
          <code className="font-mono text-[11px]">
            …/api/squarespace/oauth/callback
          </code>{" "}
          (or override with{" "}
          <code className="font-mono text-[11px]">
            SQUARESPACE_OAUTH_REDIRECT_URI
          </code>
          ).
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-4 text-sm">
      <p className="font-medium text-teal-950">Connect Squarespace (OAuth)</p>
      <p className="mt-1 text-xs text-teal-900/90">
        Required for{" "}
        <strong>Create webhook in Squarespace</strong>. Opens Squarespace to
        approve access; tokens are encrypted and stored on this machine.
      </p>
      {props.oauthConnected ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-teal-800">Connected</span>
          <button
            type="button"
            disabled={pending}
            onClick={async () => {
              setError(null);
              setPending(true);
              const r = await disconnectSquarespaceOAuth(props.machineId);
              setPending(false);
              if (!r.ok) {
                setError(r.error);
                return;
              }
              router.refresh();
            }}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
          >
            {pending ? "Disconnecting…" : "Disconnect"}
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <Link
            href={`/api/squarespace/oauth/start?machineId=${encodeURIComponent(props.machineId)}`}
            className="inline-block rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
          >
            Connect Squarespace account
          </Link>
        </div>
      )}
      {error ? (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
