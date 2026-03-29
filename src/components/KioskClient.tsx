"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type KioskState = "IDLE" | "WAITING" | "PAID" | "ERROR";

const SPEECH =
  "Payment received. Door is unlocked. Please grab your items.";

function trySpeak(): void {
  try {
    const synth = window.speechSynthesis;
    if (synth) {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(SPEECH);
      u.rate = 1;
      synth.speak(u);
      return;
    }
  } catch {
    /* ignore */
  }
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.value = 0.05;
    o.start();
    setTimeout(() => o.stop(), 120);
  } catch {
    /* autoplay may block; UI still shows paid state */
  }
}

export function KioskClient({
  machineId,
  headingIdle,
}: {
  machineId: string;
  headingIdle?: string;
}) {
  const [state, setState] = useState<KioskState>("IDLE");
  const [message, setMessage] = useState("");
  const prevState = useRef<KioskState | null>(null);

  const applyPayload = useCallback((raw: string) => {
    try {
      const d = JSON.parse(raw) as {
        state: KioskState;
        message?: string;
      };
      setState(d.state);
      setMessage(d.message ?? "");
    } catch {
      /* ignore malformed */
    }
  }, []);

  useEffect(() => {
    const es = new EventSource(
      `/api/machines/${machineId}/events/stream`
    );
    es.onmessage = (ev) => applyPayload(ev.data);
    es.onerror = () => {
      /* EventSource reconnects by default */
    };
    return () => es.close();
  }, [machineId, applyPayload]);

  useEffect(() => {
    if (state === "PAID" && prevState.current !== "PAID") {
      trySpeak();
    }
    prevState.current = state;
  }, [state]);

  useEffect(() => {
    const beat = () => {
      void fetch(`/api/machines/${machineId}/heartbeat`, {
        method: "POST",
      }).catch(() => {});
    };
    beat();
    const t = setInterval(beat, 45_000);
    return () => clearInterval(t);
  }, [machineId]);

  const startWaiting = () => {
    void fetch(`/api/machines/${machineId}/kiosk/intent`, {
      method: "POST",
    }).catch(() => {});
  };

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-between px-4 py-6 pb-10">
      <div className="w-full max-w-lg flex-1 flex flex-col items-center text-center">
        {state === "IDLE" ? (
          <>
            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {headingIdle ?? "Grab a Drink or Snack"}
            </h1>
            <div className="mt-6 w-full flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/machines/${machineId}/qr.png`}
                alt="Scan to open checkout on your phone"
                className="w-[min(88vw,28rem)] max-h-[55vh] object-contain bg-white p-3 rounded-xl"
              />
            </div>
            <p className="mt-6 text-xl font-semibold sm:text-2xl">
              Scan to pay with Apple Pay / Google Pay
            </p>
            <p className="mt-3 text-base text-zinc-300 sm:text-lg">
              Complete checkout on your phone
            </p>
            <button
              type="button"
              onClick={startWaiting}
              className="mt-8 rounded-2xl border-2 border-zinc-600 bg-zinc-900 px-6 py-4 text-lg font-medium text-white active:bg-zinc-800"
            >
              I’m checking out on my phone
            </button>
          </>
        ) : null}

        {state === "WAITING" ? (
          <>
            <h1 className="text-3xl font-bold sm:text-4xl">
              Waiting for payment…
            </h1>
            <p className="mt-6 text-xl text-zinc-200">
              Complete payment on your phone
            </p>
          </>
        ) : null}

        {state === "PAID" ? (
          <>
            <h1 className="text-3xl font-bold text-emerald-400 sm:text-4xl">
              Payment received
            </h1>
            <p className="mt-6 text-2xl font-semibold">Door unlocked</p>
            <p className="mt-4 text-xl text-zinc-200">
              Please grab your items
            </p>
            {message ? (
              <p className="mt-6 text-sm text-zinc-400">{message}</p>
            ) : null}
          </>
        ) : null}

        {state === "ERROR" ? (
          <>
            <h1 className="text-3xl font-bold text-red-400 sm:text-4xl">
              Something went wrong
            </h1>
            <p className="mt-4 text-lg text-zinc-200">
              {message || "Please contact the operator."}
            </p>
          </>
        ) : null}
      </div>
    </main>
  );
}
